import { useEffect, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button, Card, CardBody, CardHeader, Toast } from "../../components/ui";
import { ApiError, getApiUrl } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";
import { AccountAccessSettings } from "./AccountAccessSettings";
import { markOnboardingGuideSeen } from "./account.api";
import { useSessionQuery } from "../auth/auth.queries";
import type { AuthResult } from "../auth/auth.types";
import {
  updateOrganizationSettings,
  completeOnboarding,
  deleteCurrentOrganization,
  uploadOrganizationLogo
} from "./settings.api";
import { useOrganizationSettingsQuery } from "./settings.queries";
import type { OrganizationSettings } from "./settings.types";

function createPublicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArgentinaWhatsapp(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

const initialLocalSettings = {
  businessName: "",
  category: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  province: "",
  instagram: "",
  description: ""
};

const businessCategories = [
  "Barbería",
  "Peluquería",
  "Manicura y pedicura",
  "Centro de estética",
  "Odontología",
  "Consultorio médico",
  "Kinesiología",
  "Masajes",
  "Psicología",
  "Canchas de fútbol",
  "Entrenamiento personal",
  "Academia y clases"
];

const argentinaProvinces = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán"
];

type LocalSettings = typeof initialLocalSettings;
type SettingsTab = "business" | "public" | "account";

export function DashboardSettingsView({
  isOnboarding = false,
  onCompleted
}: {
  isOnboarding?: boolean;
  onCompleted?: () => void;
}) {
  const [settings, setSettings] = useState<LocalSettings>(initialLocalSettings);
  const [savedSettings, setSavedSettings] = useState<LocalSettings>(initialLocalSettings);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isClosingGuide, setIsClosingGuide] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [isEditing, setIsEditing] = useState(isOnboarding);
  const [accountHasUnsavedChanges, setAccountHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedState, setShowUnsavedState] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const settingsQuery = useOrganizationSettingsQuery();
  const sessionQuery = useSessionQuery();
  const queryClient = useQueryClient();
  const hasUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings) || Boolean(logoFile);
  const hasPendingChanges = hasUnsavedChanges || accountHasUnsavedChanges;

  useEffect(() => {
    if (settingsQuery.data) {
        const organization = settingsQuery.data;
        const loadedSettings = {
          businessName: organization.name,
          category: organization.category,
          phone: organization.phone,
          whatsapp: normalizeArgentinaWhatsapp(organization.whatsapp),
          email: organization.publicEmail,
          address: organization.address,
          city: organization.city,
          province: organization.province,
          instagram: organization.instagram,
          description: organization.description
        };
        // The form edits a local draft and persists only explicit saves.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(loadedSettings);
        setSavedSettings(loadedSettings);
        setOrganizationSlug(organization.slug);
        if (organization.hasLogo) {
          setLogoPreview(
            `${getApiUrl("/api/v1/organizations/current/logo")}?v=${Date.now()}`
          );
        }
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("turnosi:settings-dirty", { detail: hasPendingChanges })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("turnosi:settings-dirty", { detail: false })
      );
    };
  }, [hasPendingChanges]);

  useEffect(() => {
    if (!hasPendingChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasPendingChanges]);

  useEffect(() => {
    const showPendingChanges = () => setShowUnsavedState(true);
    const hidePendingChanges = () => setShowUnsavedState(false);
    window.addEventListener(
      "turnosi:show-settings-dirty",
      showPendingChanges
    );
    window.addEventListener(
      "turnosi:hide-settings-dirty",
      hidePendingChanges
    );
    return () => {
      window.removeEventListener(
        "turnosi:show-settings-dirty",
        showPendingChanges
      );
      window.removeEventListener(
        "turnosi:hide-settings-dirty",
        hidePendingChanges
      );
    };
  }, []);


  function updateSetting(field: keyof LocalSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  const publicSlug = organizationSlug || createPublicSlug(settings.businessName);

  function getNextOnboardingTab(nextSavedSettings: LocalSettings): SettingsTab {
    const hasBusinessData = Boolean(
      nextSavedSettings.businessName &&
        nextSavedSettings.category &&
        nextSavedSettings.phone &&
        nextSavedSettings.description
    );
    const hasPublicData = Boolean(
      nextSavedSettings.address &&
        nextSavedSettings.city &&
        nextSavedSettings.province
    );
    const hasAccountData = Boolean(
      sessionQuery.data?.data.user.firstName &&
        sessionQuery.data.data.user.lastName
    );

    if (!hasBusinessData) return "business";
    if (!hasPublicData) return "public";
    if (!hasAccountData) return "account";
    return activeTab;
  }

  async function saveSettings() {
    if (isSaving) return;
    if (settings.businessName.trim().length < 2) {
      setMessage("Ingresá el nombre del local.");
      return;
    }
    const changes = {
        ...(settings.businessName !== savedSettings.businessName
          ? { name: settings.businessName }
          : {}),
        ...(settings.category !== savedSettings.category
          ? { category: settings.category }
          : {}),
        ...(settings.phone !== savedSettings.phone
          ? { phone: settings.phone }
          : {}),
        ...(settings.whatsapp !== savedSettings.whatsapp
          ? { whatsapp: settings.whatsapp }
          : {}),
        ...(settings.email !== savedSettings.email
          ? { publicEmail: settings.email }
          : {}),
        ...(settings.address !== savedSettings.address
          ? { address: settings.address }
          : {}),
        ...(settings.city !== savedSettings.city
          ? { city: settings.city }
          : {}),
        ...(settings.province !== savedSettings.province
          ? { province: settings.province }
          : {}),
        ...(settings.instagram !== savedSettings.instagram
          ? { instagram: settings.instagram }
          : {}),
        ...(settings.description !== savedSettings.description
          ? { description: settings.description }
          : {})
    };

    if (Object.keys(changes).length === 0 && !logoFile && !isOnboarding) {
      setToast("No hay cambios por guardar.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      if (Object.keys(changes).length > 0 || isOnboarding) {
        await updateOrganizationSettings(changes);
        queryClient.setQueryData<OrganizationSettings>(
          queryKeys.organizationSettings,
          (current) =>
            current
              ? {
                  ...current,
                  name: settings.businessName,
                  category: settings.category,
                  phone: settings.phone,
                  publicEmail: settings.email,
                  address: settings.address,
                  city: settings.city,
                  province: settings.province,
                  instagram: settings.instagram,
                  description: settings.description,
                  onboardingCompleted: current.onboardingCompleted
                }
              : current
        );
        queryClient.setQueryData<AuthResult>(queryKeys.session, (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  organizations: current.data.organizations?.map(
                    (organization, index) =>
                      index === 0
                        ? { ...organization, name: settings.businessName }
                        : organization
                  )
                }
              }
            : current
        );
      }
      if (logoFile) {
        await uploadOrganizationLogo(logoFile);
        queryClient.setQueryData<OrganizationSettings>(
          queryKeys.organizationSettings,
          (current) => current ? { ...current, hasLogo: true } : current
        );
        queryClient.setQueryData<AuthResult>(queryKeys.session, (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  organizations: current.data.organizations?.map(
                    (organization, index) =>
                      index === 0 ? { ...organization, hasLogo: true } : organization
                  )
                }
              }
            : current
        );
        window.dispatchEvent(new Event("turnosi:logo-updated"));
        setLogoFile(null);
      }
      const nextSavedSettings = settings;
      setSavedSettings(nextSavedSettings);
      setMessage("");
      setToast("✓ Cambios guardados.");
      if (isOnboarding) {
        const nextTab = getNextOnboardingTab(nextSavedSettings);
        if (nextTab !== activeTab) setActiveTab(nextTab);
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
      setShowUnsavedState(false);
    } catch {
      setMessage("No pudimos guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  }

  const onboardingTasks: {
    label: string;
    done: boolean;
    tab: SettingsTab;
  }[] = [
    {
      label: "Nombre y apellido",
      done: Boolean(
        sessionQuery.data?.data.user.firstName &&
          sessionQuery.data.data.user.lastName
      ),
      tab: "account"
    },
    {
      label: "Datos del local",
      done: Boolean(
        savedSettings.businessName &&
          savedSettings.category &&
          savedSettings.description
      ),
      tab: "business"
    },
    {
      label: "Contacto y página",
      done: Boolean(
        savedSettings.phone &&
        savedSettings.address &&
        savedSettings.city &&
          savedSettings.province
      ),
      tab: "public"
    }
  ];
  const completedTaskCount = onboardingTasks.filter((task) => task.done).length;
  const onboardingReady = completedTaskCount === onboardingTasks.length;

  async function finishOnboarding() {
    if (!onboardingReady || hasPendingChanges || isCompleting) return;
    setIsCompleting(true);
    setMessage("");
    try {
      await completeOnboarding();
      queryClient.setQueryData<OrganizationSettings>(
        queryKeys.organizationSettings,
        (current) =>
          current ? { ...current, onboardingCompleted: true } : current
      );
      onCompleted?.();
    } catch {
      setMessage("Todavía faltan tareas obligatorias por completar.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function closeOnboardingGuide(startNow: boolean) {
    if (isClosingGuide) return;
    setIsClosingGuide(true);
    try {
      await markOnboardingGuideSeen();
      queryClient.setQueryData<AuthResult>(queryKeys.session, (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                user: {
                  ...current.data.user,
                  onboardingGuideSeen: true
                }
              }
            }
          : current
      );
      if (startNow) {
        setActiveTab(
          onboardingTasks.find((task) => !task.done)?.tab ?? "business"
        );
      }
    } finally {
      setIsClosingGuide(false);
    }
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 1024 * 1024) {
      setMessage("El logo no puede superar 1 MB.");
      event.target.value = "";
      return;
    }
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    setMessage("");
  }

  function cancelEditing() {
    setSettings(savedSettings);
    setLogoFile(null);
    setLogoPreview(
      settingsQuery.data?.hasLogo
        ? `${getApiUrl("/api/v1/organizations/current/logo")}?v=${Date.now()}`
        : ""
    );
    setMessage("");
    setIsEditing(false);
    setShowUnsavedState(false);
  }

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5">
      {isOnboarding &&
        sessionQuery.data &&
        !sessionQuery.data.data.user.onboardingGuideSeen && (
          <div className="fixed inset-0 z-[110] grid place-items-end bg-[rgba(32,24,54,0.66)] p-3 backdrop-blur-sm sm:place-items-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-guide-title"
              className="w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_30px_100px_rgba(32,24,54,0.4)] sm:p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Primeros pasos
              </p>
              <h2
                id="onboarding-guide-title"
                className="mt-2 text-2xl font-semibold"
              >
                Preparemos tu negocio para recibir turnos
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
                Te guiaremos por cuatro tareas breves. Hasta terminarlas, las
                demás secciones permanecerán bloqueadas para evitar una página
                pública incompleta.
              </p>
              <ol className="mt-5 grid gap-2 sm:grid-cols-2">
                {onboardingTasks.map((task, index) => (
                  <li
                    key={task.label}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-white/55 p-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{task.label}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  disabled={isClosingGuide}
                  onClick={() => void closeOnboardingGuide(false)}
                >
                  Lo haré después
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={isClosingGuide}
                  onClick={() => void closeOnboardingGuide(true)}
                >
                  {isClosingGuide ? "Preparando..." : "Empezar configuración"}
                </Button>
              </div>
            </section>
          </div>
        )}
      <nav className="flex w-fit max-w-full overflow-x-auto rounded-md border border-[var(--color-border)] bg-[rgba(255,251,244,0.84)] p-1">
        {([
          ["business", "Local", "Datos del local"],
          ["public", "Contacto", "Contacto y página"],
          ["account", "Cuenta", "Cuenta"]
        ] as [SettingsTab, string, string][]).map(([value, shortLabel, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              if (activeTab !== value && hasPendingChanges) {
                setShowUnsavedState(true);
                setPendingTab(value);
                return;
              }
              setActiveTab(value);
            }}
            className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              activeTab === value
                ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                : "text-[var(--color-muted-strong)] hover:bg-white/60"
            }`}
          >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>

      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4 sm:space-y-5">
        {isOnboarding && (
          <section className="rounded-lg border border-[var(--color-accent)] bg-[rgba(253,134,6,0.08)] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold">Completá tu perfil</h2>
                  <span className="text-xs font-semibold text-[var(--color-muted-strong)]">
                    {completedTaskCount}/{onboardingTasks.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full min-w-48 overflow-hidden rounded-full bg-white/80 sm:w-64">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
                    style={{
                      width: `${(completedTaskCount / onboardingTasks.length) * 100}%`
                    }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                disabled={!onboardingReady || hasPendingChanges || isCompleting}
                onClick={() => void finishOnboarding()}
              >
                {isCompleting ? "Finalizando..." : "Finalizar configuración"}
              </Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {onboardingTasks.map((task) => (
                <button
                  key={task.label}
                  type="button"
                  onClick={() => setActiveTab(task.tab)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    task.done
                      ? "border-[#b9d8bf] bg-[#eef8ee] text-[#28633a]"
                      : "border-[var(--color-border-strong)] bg-white/75 text-[var(--color-ink)]"
                  }`}
                >
                  {task.done ? "✓ " : ""}{task.label}
                </button>
              ))}
            </div>
          </section>
        )}
        {activeTab !== "account" && <form
          id="organization-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSettings();
          }}
        >
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
              <h2 className="text-base font-semibold">
                {activeTab === "business" ? "Datos del local" : "Contacto y página pública"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                {activeTab === "business"
                  ? "Definí la identidad y presentación de tu negocio."
                  : "Configurá cómo te encuentran y contactan tus clientes."}
              </p>
              </div>
              {!isOnboarding && !isEditing && (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Editar información
                </Button>
              )}
            </div>
          </CardHeader>
          {message && (
            <p role="status" className="px-4 pt-4 text-sm text-[var(--color-muted-strong)]">
              {message}
            </p>
          )}
          <CardBody className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
            {activeTab === "business" && (
              <>
            <div className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Logo del negocio <span className="font-normal">(opcional)</span>
              </span>
              {logoPreview ? (
                <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-white/45 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Logo del negocio"
                      className="h-16 w-16 shrink-0 rounded-xl border border-[var(--color-border)] object-cover shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {settings.businessName || "Logo del negocio"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {logoFile ? "Cambio pendiente de guardar" : "Logo actual"}
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <label className="shrink-0 cursor-pointer rounded-md border border-[var(--color-border-strong)] bg-white/70 px-3 py-2 text-center font-medium text-[var(--color-ink)] hover:border-[var(--color-accent)] sm:self-center">
                      Cambiar logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-white/35 px-5 py-7 text-center ${
                  isEditing
                    ? "cursor-pointer hover:border-[var(--color-accent)] hover:bg-white/55"
                    : "cursor-default"
                }`}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg font-semibold text-white">
                    {settings.businessName.charAt(0).toUpperCase() || "+"}
                  </span>
                  <span className="mt-3 font-semibold text-[var(--color-ink)]">
                    Subir logo
                  </span>
                  <span className="mt-1 text-xs text-[var(--color-muted)]">
                    PNG, JPEG o WebP. Máximo 1 MB.
                  </span>
                  <input
                    type="file"
                    disabled={!isEditing}
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
            <SettingsField
              label="Nombre del local"
              placeholder="Ej: Barbería Central"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.businessName}
              value={settings.businessName}
              onChange={(value) => updateSetting("businessName", value)}
            />
            <SettingsField
              label="Rubro"
              placeholder="Ej: Peluquería"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.category}
              options={businessCategories}
              value={settings.category}
              onChange={(value) => updateSetting("category", value)}
            />
            <label className="relative grid gap-1.5 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Descripción pública
              </span>
              <textarea
                value={settings.description}
                disabled={!isEditing}
                placeholder="Contá brevemente qué servicios ofrece tu negocio."
                onChange={(event) =>
                  updateSetting("description", event.target.value)
                }
                className={`min-h-28 rounded-md border bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:bg-[rgba(32,24,54,0.035)] focus:ring-2 ${
                  showUnsavedState &&
                  settings.description !== savedSettings.description
                    ? "border-[#d65a50] focus:border-[#d65a50] focus:ring-[rgba(214,90,80,0.16)]"
                    : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[rgba(253,134,6,0.2)]"
                }`}
              />
            </label>
              </>
            )}
            {activeTab === "public" && (
              <>
            <SettingsField
              label="Teléfono"
              placeholder="Ej: 11 2345 6789"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.phone}
              value={settings.phone}
              onChange={(value) => updateSetting("phone", value)}
            />
            <SettingsField
              label="WhatsApp"
              prefix="+54 9"
              placeholder="Ej: 11 2345 6789"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.whatsapp}
              value={settings.whatsapp}
              onChange={(value) =>
                updateSetting("whatsapp", normalizeArgentinaWhatsapp(value))
              }
            />
            <SettingsField
              label="Email público"
              placeholder="Ej: contacto@negocio.com"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.email}
              value={settings.email}
              onChange={(value) => updateSetting("email", value)}
            />
            <SettingsField
              className="md:col-span-2"
              label="Dirección"
              placeholder="Ej: Av. Corrientes 1234"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.address}
              value={settings.address}
              onChange={(value) => updateSetting("address", value)}
            />
            <SettingsField
              label="Localidad"
              placeholder="Ej: Palermo"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.city}
              value={settings.city}
              onChange={(value) => updateSetting("city", value)}
            />
            <label className="relative grid gap-1.5 text-sm">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Provincia
              </span>
              <select
                disabled={!isEditing}
                value={settings.province}
                onChange={(event) => updateSetting("province", event.target.value)}
                className={`h-10 rounded-md border bg-white/70 px-3 outline-none disabled:cursor-not-allowed disabled:bg-[rgba(32,24,54,0.035)] ${
                  showUnsavedState &&
                  settings.province !== savedSettings.province
                    ? "border-[#d65a50] focus:border-[#d65a50]"
                    : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)]"
                }`}
              >
                <option value="">Seleccionar provincia</option>
                {argentinaProvinces.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </label>
            <SettingsField
              label="Instagram"
              placeholder="Ej: @minegocio"
              readOnly={!isEditing}
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.instagram}
              value={settings.instagram}
              onChange={(value) => updateSetting("instagram", value)}
            />
            <SettingsField
              actionHref={`/book/${publicSlug}`}
              label="URL pública"
              prefix="turnosi.com/"
              readOnly
              value={publicSlug}
            />
              </>
            )}
            {isEditing && (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-center md:col-span-2">
                {!isOnboarding && (
                  <Button type="button" onClick={cancelEditing} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                )}
                <Button type="submit" variant="primary" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
        </form>}

        {activeTab === "account" && (
          <>
            <AccountAccessSettings
              highlightChanges={showUnsavedState}
              onDirtyChange={setAccountHasUnsavedChanges}
            />
          </>
        )}

        {activeTab === "account" && <Card className="border-[#e7b9b2] bg-[rgba(253,232,229,0.45)]">
          <CardHeader>
            <div>
              <h2 className="text-base font-semibold text-[#8f1b13]">
                Zona peligrosa
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                Acciones críticas de la cuenta y del local.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[#e7b9b2] bg-[#fffaf4] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#8f1b13]">
                  Eliminar cuenta
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                  Esta acción eliminará el local, turnos, configuración y accesos.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-[#b42318] text-[#b42318] hover:bg-[#fde8e5]"
              >
                Eliminar cuenta
              </Button>
            </div>
          </CardBody>
        </Card>}
      </div>

      <aside className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardBody className="p-4 sm:p-5">
            <h2 className="text-base font-semibold">Vista pública</h2>
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white/50 p-4">
              <p className="text-lg font-semibold">{settings.businessName}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                {settings.category}
              </p>
              <div className="mt-4 space-y-2 text-sm text-[var(--color-muted-strong)]">
                <p>{settings.phone}</p>
                {settings.whatsapp && <p>WhatsApp: +54 9 {settings.whatsapp}</p>}
                <p>{[settings.address, settings.city, settings.province].filter(Boolean).join(", ")}</p>
                <p>{settings.instagram}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 sm:p-5">
            <h2 className="text-base font-semibold">Checklist</h2>
            <div className="mt-4 space-y-3 text-sm">
              <ChecklistItem label="Teléfono cargado" done={Boolean(settings.phone)} />
              <ChecklistItem label="WhatsApp cargado" done={Boolean(settings.whatsapp)} />
              <ChecklistItem label="Dirección cargada" done={Boolean(settings.address)} />
              <ChecklistItem label="Provincia definida" done={Boolean(settings.province)} />
              <ChecklistItem label="Instagram cargado" done={Boolean(settings.instagram)} />
              <ChecklistItem label="URL pública definida" done={Boolean(publicSlug)} />
            </div>
          </CardBody>
        </Card>
      </aside>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} />
      )}
      {pendingTab && (
        <UnsavedChangesModal
          onCancel={() => {
            setShowUnsavedState(false);
            setPendingTab(null);
          }}
          onConfirm={() => {
            if (hasUnsavedChanges) cancelEditing();
            setActiveTab(pendingTab);
            setPendingTab(null);
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </section>
  );
}

function SettingsField({
  className = "",
  actionHref,
  highlightChanges = false,
  label,
  onChange,
  options,
  placeholder,
  prefix,
  readOnly = false,
  savedValue,
  value
}: {
  className?: string;
  actionHref?: string;
  highlightChanges?: boolean;
  label: string;
  onChange?: (value: string) => void;
  options?: string[];
  placeholder?: string;
  prefix?: string;
  readOnly?: boolean;
  savedValue?: string;
  value: string;
}) {
  const changed =
    highlightChanges && savedValue !== undefined && value !== savedValue;

  return (
    <label className={`relative grid gap-1.5 text-sm ${className}`}>
      <span className="font-semibold text-[var(--color-muted-strong)]">{label}</span>
      <span className={`flex min-w-0 overflow-hidden rounded-md border bg-white/70 focus-within:ring-2 ${
        changed
          ? "border-[#d65a50] focus-within:border-[#d65a50] focus-within:ring-[rgba(214,90,80,0.16)]"
          : "border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)] focus-within:ring-[rgba(253,134,6,0.2)]"
      }`}>
        {prefix && (
          <span className="shrink-0 border-r border-[var(--color-border)] px-3 py-2 text-[var(--color-muted)]">
            {prefix}
          </span>
        )}
        <input
          list={options ? `settings-${createPublicSlug(label)}` : undefined}
          readOnly={readOnly}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className={`min-w-0 flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-[var(--color-muted)] ${
            readOnly ? "cursor-not-allowed bg-[rgba(32,24,54,0.035)] text-[var(--color-muted-strong)]" : ""
          }`}
        />
        {actionHref && (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 border-l border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-ink)] hover:bg-[rgba(253,134,6,0.1)]"
          >
            Ver página
          </a>
        )}
        {options && (
          <datalist id={`settings-${createPublicSlug(label)}`}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </span>
      {readOnly && actionHref && (
        <span className="text-xs text-[var(--color-muted)]">
          Se genera automáticamente desde el nombre del local.
        </span>
      )}
    </label>
  );
}

function UnsavedChangesModal({
  onCancel,
  onConfirm
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
      >
        <h2 className="text-lg font-semibold">Tenés cambios sin guardar</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
          Si continuás, los cambios realizados se perderán.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            Descartar cambios
          </Button>
        </div>
      </section>
    </div>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canConfirm = password.trim().length >= 6;

  async function handleConfirmDelete() {
    if (!canConfirm || isDeleting) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteCurrentOrganization(password);
      queryClient.clear();
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "INVALID_PASSWORD"
          ? "La contraseña no es correcta."
          : "No pudimos eliminar la cuenta. No se realizó ningún cambio."
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.62)] px-3 py-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-lg rounded-lg border border-[#e7b9b2] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]">
        <h2 className="text-lg font-semibold text-[#8f1b13]">
          Confirmar eliminación
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
          Se cancelará la suscripción y se eliminarán el negocio, turnos,
          clientes, equipo y configuración. Esta acción no se puede deshacer.
        </p>

        <label className="mt-4 grid gap-1.5 text-sm">
          <span className="font-semibold text-[var(--color-muted-strong)]">
            Contraseña
          </span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="h-10 rounded-md border border-[#e7b9b2] bg-white/70 px-3 outline-none focus:border-[#b42318] focus:ring-2 focus:ring-[rgba(180,35,24,0.18)]"
          />
        </label>
        {error && <p className="mt-3 text-sm font-medium text-[#b42318]">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || isDeleting}
            onClick={() => void handleConfirmDelete()}
            className={`border-[#b42318] bg-[#b42318] text-white hover:bg-[#9f1f16] ${
              canConfirm ? "" : "cursor-not-allowed opacity-50 hover:translate-y-0"
            }`}
          >
            {isDeleting ? "Eliminando..." : "Eliminar definitivamente"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-muted-strong)]">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          done ? "bg-[#e3f3e5] text-[#347a43]" : "bg-[#fde8e5] text-[#b42318]"
        }`}
      >
        {done ? "Listo" : "Pendiente"}
      </span>
    </div>
  );
}
