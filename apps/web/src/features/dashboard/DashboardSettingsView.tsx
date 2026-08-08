import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
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
  updateOrganizationSettingsSection,
  completeOnboarding,
  deleteOrganizationGalleryImage,
  deleteCurrentOrganization,
  type GalleryUploadResult,
  uploadOrganizationGalleryImage,
  uploadOrganizationLogo
} from "./settings.api";
import { useOrganizationSettingsQuery } from "./settings.queries";
import type { OrganizationSettings } from "./settings.types";
import { argentinaProvinces } from "./dashboard.options";
import businessIcon from "../../components/assets/icons/nav-home.svg";
import contactIcon from "../../components/assets/icons/nav-team.svg";
import pageIcon from "../../components/assets/icons/nav-calendar.svg";
import paymentsIcon from "../../components/assets/icons/nav-availability.svg";
import accountIcon from "../../components/assets/icons/nav-settings.svg";

function createPublicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArgentinaPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits ? `+549${digits.slice(0, 10)}` : "";
}

function getArgentinaPhoneNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatImageBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const settingsFieldLimits = {
  businessName: 120,
  category: 120,
  phone: 10,
  publicEmail: 254,
  address: 240,
  city: 120,
  instagram: 80,
  description: 500,
  mercadoPagoAccessToken: 260
} as const;

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
  description: "",
  mercadoPagoAccessToken: "",
  mercadoPagoConnected: false,
  depositEnabled: false,
  depositAmount: ""
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
const customBusinessCategory = "__custom__";

type LocalSettings = typeof initialLocalSettings;
type SettingsTab = "business" | "contact" | "page" | "payments" | "account";
type GalleryUploadState = {
  originalBytes?: number;
  optimizedBytes?: number;
  progress: number;
  status: "idle" | "ready" | "uploading" | "done";
};

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
  const [customCategoryDraft, setCustomCategoryDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isClosingGuide, setIsClosingGuide] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<(File | null)[]>([null, null]);
  const [galleryPreviews, setGalleryPreviews] = useState(["", ""]);
  const [galleryUploadStates, setGalleryUploadStates] = useState<
    GalleryUploadState[]
  >([
    { progress: 0, status: "idle" },
    { progress: 0, status: "idle" }
  ]);
  const [galleryDeleteSlots, setGalleryDeleteSlots] = useState([false, false]);
  const [galleryFocus, setGalleryFocus] = useState([
    { slot: 0 as 0 | 1, focusX: 50, focusY: 50, zoom: 100 },
    { slot: 1 as 0 | 1, focusX: 50, focusY: 50, zoom: 100 }
  ]);
  const [cropEditorSlot, setCropEditorSlot] = useState<0 | 1 | null>(null);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");
  const [accountHasUnsavedChanges, setAccountHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedState, setShowUnsavedState] = useState(false);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const settingsQuery = useOrganizationSettingsQuery();
  const sessionQuery = useSessionQuery();
  const queryClient = useQueryClient();
  const hasGalleryFocusChanges =
    JSON.stringify(galleryFocus) !==
    JSON.stringify(
      [0, 1].map((slot) => {
        const saved = settingsQuery.data?.galleryFocus.find((item) => item.slot === slot);
        return {
          slot: slot as 0 | 1,
          focusX: saved?.focusX ?? 50,
          focusY: saved?.focusY ?? 50,
          zoom: saved?.zoom ?? 100
        };
      })
    );
  const hasUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings) ||
    Boolean(logoFile) ||
    galleryFiles.some(Boolean) ||
    galleryDeleteSlots.some(Boolean) ||
    hasGalleryFocusChanges;
  const hasPendingChanges = hasUnsavedChanges || accountHasUnsavedChanges;
  const hasBusinessChanges =
    settings.businessName !== savedSettings.businessName ||
    settings.category !== savedSettings.category ||
    settings.description !== savedSettings.description ||
    Boolean(logoFile) ||
    galleryFiles.some(Boolean) ||
    galleryDeleteSlots.some(Boolean) ||
    hasGalleryFocusChanges;
  const hasContactChanges =
    settings.phone !== savedSettings.phone ||
    settings.whatsapp !== savedSettings.whatsapp ||
    settings.email !== savedSettings.email ||
    settings.address !== savedSettings.address ||
    settings.city !== savedSettings.city ||
    settings.province !== savedSettings.province ||
    settings.instagram !== savedSettings.instagram;
  const hasPaymentChanges =
    Boolean(settings.mercadoPagoAccessToken.trim()) ||
    (settings.mercadoPagoConnected !== savedSettings.mercadoPagoConnected &&
      !settings.mercadoPagoConnected) ||
    settings.depositEnabled !== savedSettings.depositEnabled ||
    moneyToCents(settings.depositAmount) !== moneyToCents(savedSettings.depositAmount);
  const hasActiveSectionChanges =
    activeTab === "business"
      ? hasBusinessChanges
      : activeTab === "contact"
        ? hasContactChanges
        : activeTab === "payments"
          ? hasPaymentChanges
          : false;

  useEffect(() => {
    if (settingsQuery.data) {
        const organization = settingsQuery.data;
        const loadedSettings = {
          businessName: organization.name,
          category: organization.category,
          phone: normalizeArgentinaPhone(organization.phone),
          whatsapp: normalizeArgentinaPhone(organization.whatsapp),
          email: organization.publicEmail,
          address: organization.address,
          city: organization.city,
          province: organization.province,
          instagram: organization.instagram,
          description: organization.description,
          mercadoPagoAccessToken: "",
          mercadoPagoConnected: organization.mercadoPagoConnected,
          depositEnabled: organization.depositEnabled,
          depositAmount: centsToMoney(organization.depositAmountCents)
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
        setGalleryPreviews([
          organization.galleryImageSlots.includes(0)
            ? `${getApiUrl("/api/v1/organizations/current/gallery/0")}?v=${Date.now()}`
            : "",
          organization.galleryImageSlots.includes(1)
            ? `${getApiUrl("/api/v1/organizations/current/gallery/1")}?v=${Date.now()}`
            : ""
        ]);
        setGalleryFocus(
          [0, 1].map((slot) => {
            const saved = organization.galleryFocus.find((item) => item.slot === slot);
            return {
              slot: slot as 0 | 1,
              focusX: saved?.focusX ?? 50,
              focusY: saved?.focusY ?? 50,
              zoom: saved?.zoom ?? 100
            };
          })
        );
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


function moneyToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function centsToMoney(value: number | null) {
  if (!value) return "";
  return String(value / 100);
}

  function updateSetting<K extends keyof LocalSettings>(field: K, value: LocalSettings[K]) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  const publicSlug = organizationSlug || createPublicSlug(settings.businessName);

  function getNextOnboardingTab(nextSavedSettings: LocalSettings): SettingsTab {
    const hasBusinessData = Boolean(
      nextSavedSettings.businessName &&
        nextSavedSettings.category &&
        nextSavedSettings.description
    );
    const hasContactData = Boolean(
      nextSavedSettings.phone &&
        nextSavedSettings.whatsapp &&
        nextSavedSettings.email
    );
    const hasPageData = Boolean(
      nextSavedSettings.address &&
        nextSavedSettings.city &&
        nextSavedSettings.province
    );
    const hasAccountData = Boolean(
      sessionQuery.data?.data.user.firstName &&
        sessionQuery.data.data.user.lastName
    );

    if (!hasBusinessData) return "business";
    if (!hasContactData) return "contact";
    if (!hasPageData) return "page";
    if (!hasAccountData) return "account";
    return activeTab;
  }

  async function saveSettings() {
    if (isSaving) return false;
    if (activeTab === "business" && settings.businessName.trim().length < 2) {
      setMessage("Ingresá el nombre del local.");
      return false;
    }
    if (activeTab === "business" && settings.description.length > settingsFieldLimits.description) {
      setMessage(`La descripción pública puede tener hasta ${settingsFieldLimits.description} caracteres.`);
      return false;
    }
    if (activeTab === "contact" && settings.instagram.length > settingsFieldLimits.instagram) {
      setMessage(`Instagram puede tener hasta ${settingsFieldLimits.instagram} caracteres.`);
      return false;
    }
    const changes =
      activeTab === "business"
        ? {
            ...(settings.businessName !== savedSettings.businessName
              ? { name: settings.businessName }
              : {}),
            ...(settings.category !== savedSettings.category
              ? { category: settings.category }
              : {}),
            ...(settings.description !== savedSettings.description
              ? { description: settings.description }
              : {})
          }
        : activeTab === "contact"
          ? {
              ...(settings.phone !== savedSettings.phone
                ? { phone: settings.phone }
                : {}),
              ...(settings.whatsapp !== savedSettings.whatsapp
                ? { whatsapp: settings.whatsapp }
                : {}),
              ...(settings.email !== savedSettings.email
                ? { publicEmail: settings.email }
                : {}),
              ...(settings.instagram !== savedSettings.instagram
                ? { instagram: settings.instagram }
                : {}),
            ...(settings.address !== savedSettings.address
              ? { address: settings.address }
              : {}),
            ...(settings.city !== savedSettings.city
              ? { city: settings.city }
              : {}),
            ...(settings.province !== savedSettings.province
              ? { province: settings.province }
              : {})
          }
          : activeTab === "payments"
            ? {
                ...(settings.mercadoPagoAccessToken.trim()
                  ? { mercadoPagoAccessToken: settings.mercadoPagoAccessToken.trim() }
                  : {}),
                ...(settings.mercadoPagoConnected !== savedSettings.mercadoPagoConnected &&
                !settings.mercadoPagoConnected
                  ? { mercadoPagoDisconnect: true }
                  : {}),
                ...(settings.depositEnabled !== savedSettings.depositEnabled
                  ? { depositEnabled: settings.depositEnabled }
                  : {}),
                ...(moneyToCents(settings.depositAmount) !== moneyToCents(savedSettings.depositAmount)
                  ? { depositAmountCents: moneyToCents(settings.depositAmount) }
                  : {})
              }
            : {};
    const shouldSaveSection =
      activeTab !== "account" &&
      activeTab !== "page" &&
      (Object.keys(changes).length > 0 ||
        (activeTab === "business" && hasGalleryFocusChanges) ||
        isOnboarding);

    if (
      Object.keys(changes).length === 0 &&
      !logoFile &&
      !galleryFiles.some(Boolean) &&
      !galleryDeleteSlots.some(Boolean) &&
      !hasGalleryFocusChanges &&
      !isOnboarding
    ) {
      setToast("Todo está guardado.");
      return true;
    }

    setIsSaving(true);
    setMessage("");
    try {
      if (shouldSaveSection) {
        await updateOrganizationSettingsSection(activeTab, {
          ...changes,
          ...(activeTab === "business" ? { galleryFocus } : {})
        });
        queryClient.setQueryData<OrganizationSettings>(
          queryKeys.organizationSettings,
          (current) =>
            current
              ? {
                  ...current,
                  name: settings.businessName,
                  category: settings.category,
                  phone: settings.phone,
                  whatsapp: settings.whatsapp,
                  publicEmail: settings.email,
                  address: settings.address,
                  city: settings.city,
                  province: settings.province,
                  instagram: settings.instagram,
                  description: settings.description,
                  mercadoPagoConnected:
                    Boolean(settings.mercadoPagoAccessToken.trim()) ||
                    settings.mercadoPagoConnected,
                  depositEnabled: settings.depositEnabled,
                  depositAmountCents: moneyToCents(settings.depositAmount),
                  galleryFocus,
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
      for (const [slot, shouldDelete] of galleryDeleteSlots.entries()) {
        const hadSavedImage = settingsQuery.data?.galleryImageSlots.includes(slot);
        if (shouldDelete && hadSavedImage) {
          await deleteOrganizationGalleryImage(slot as 0 | 1);
        }
      }
      for (const [slot, file] of galleryFiles.entries()) {
        if (!file) continue;
        setGalleryUploadStates((current) => {
          const next = [...current];
          next[slot] = {
            originalBytes: file.size,
            progress: 4,
            status: "uploading"
          };
          return next;
        });
        const uploadResult = await uploadOrganizationGalleryImage(
          slot as 0 | 1,
          file,
          (progress) => {
            setGalleryUploadStates((current) => {
              const next = [...current];
              next[slot] = {
                ...next[slot],
                originalBytes: file.size,
                progress,
                status: "uploading"
              };
              return next;
            });
          }
        );
        const optimized = uploadResult.data as GalleryUploadResult;
        setGalleryUploadStates((current) => {
          const next = [...current];
          next[slot] = {
            originalBytes: optimized.originalBytes,
            optimizedBytes: optimized.optimizedBytes,
            progress: 100,
            status: "done"
          };
          return next;
        });
      }
      if (galleryFiles.some(Boolean)) {
        queryClient.setQueryData<OrganizationSettings>(
          queryKeys.organizationSettings,
          (current) =>
            current
              ? {
                  ...current,
                  galleryImageSlots: [0, 1].filter(
                    (slot) => galleryPreviews[slot] || galleryFiles[slot]
                  )
                }
              : current
        );
        setGalleryFiles([null, null]);
      }
      if (galleryDeleteSlots.some(Boolean)) {
        setGalleryDeleteSlots([false, false]);
      }
      const refreshedSettings = await settingsQuery.refetch();
      const latestSettings = refreshedSettings.data;
      if (latestSettings) {
        const galleryVersionBySlot = new Map(
          latestSettings.galleryVersions.map((item) => [item.slot, item.version])
        );
        setGalleryPreviews([
          latestSettings.galleryImageSlots.includes(0)
            ? `${getApiUrl("/api/v1/organizations/current/gallery/0")}?v=${galleryVersionBySlot.get(0) ?? Date.now()}`
            : "",
          latestSettings.galleryImageSlots.includes(1)
            ? `${getApiUrl("/api/v1/organizations/current/gallery/1")}?v=${galleryVersionBySlot.get(1) ?? Date.now()}`
            : ""
        ]);
      }
      setGalleryUploadStates([
        { progress: 0, status: "idle" },
        { progress: 0, status: "idle" }
      ]);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.publicBooking(publicSlug)
      });
      if (organizationSlug && organizationSlug !== publicSlug) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.publicBooking(organizationSlug)
        });
      }
      const nextSavedSettings = {
        ...settings,
        mercadoPagoAccessToken: "",
        mercadoPagoConnected:
          Boolean(settings.mercadoPagoAccessToken.trim()) ||
          settings.mercadoPagoConnected
      };
      setSettings(nextSavedSettings);
      setSavedSettings(nextSavedSettings);
      setMessage("");
      setToast("✓ Cambios guardados.");
      if (isOnboarding) {
        const nextTab = getNextOnboardingTab(nextSavedSettings);
        if (nextTab !== activeTab) setActiveTab(nextTab);
      }
      setShowUnsavedState(false);
      return true;
    } catch {
      setMessage("No pudimos guardar la configuración.");
      return false;
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
      label: "Contacto",
      done: Boolean(
        savedSettings.phone &&
          savedSettings.whatsapp &&
          savedSettings.email
      ),
      tab: "contact"
    },
    {
      label: "Página pública",
      done: Boolean(
        savedSettings.address &&
        savedSettings.city &&
          savedSettings.province
      ),
      tab: "page"
    }
  ];
  const completedTaskCount = onboardingTasks.filter((task) => task.done).length;
  const onboardingReady = completedTaskCount === onboardingTasks.length;
  const profileCompletionItems: {
    icon: string;
    label: string;
    done: boolean;
    tab: SettingsTab;
  }[] = [
    {
      icon: businessIcon,
      label: "Información del negocio",
      done: Boolean(savedSettings.businessName && savedSettings.category && savedSettings.description),
      tab: "business"
    },
    {
      icon: contactIcon,
      label: "Contacto",
      done: Boolean(savedSettings.phone && savedSettings.whatsapp && savedSettings.email),
      tab: "contact"
    },
    {
      icon: pageIcon,
      label: "Página pública",
      done: Boolean(savedSettings.address && savedSettings.city && savedSettings.province && publicSlug),
      tab: "page"
    },
    {
      icon: paymentsIcon,
      label: "Cobros",
      done: Boolean(settings.mercadoPagoConnected || !settings.depositEnabled),
      tab: "payments"
    },
    {
      icon: accountIcon,
      label: "Cuenta",
      done: Boolean(
        sessionQuery.data?.data.user.firstName &&
          sessionQuery.data.data.user.lastName &&
          sessionQuery.data.data.user.email
      ),
      tab: "account"
    }
  ];
  const profileCompletionPercent = Math.round(
    (profileCompletionItems.filter((item) => item.done).length /
      profileCompletionItems.length) *
      100
  );

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
    if (file && file.size > 8 * 1024 * 1024) {
      setMessage("El logo no puede superar 8 MB.");
      event.target.value = "";
      return;
    }
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
    setMessage("");
  }

  function handleGalleryChange(slot: 0 | 1, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      setMessage("Cada imagen del local no puede superar 10 MB.");
      event.target.value = "";
      return;
    }
    setGalleryFiles((current) => {
      const next = [...current];
      next[slot] = file;
      return next;
    });
    setGalleryUploadStates((current) => {
      const next = [...current];
      next[slot] = file
        ? {
            originalBytes: file.size,
            optimizedBytes: undefined,
            progress: 0,
            status: "ready"
          }
        : { progress: 0, status: "idle" };
      return next;
    });
    setGalleryDeleteSlots((current) => {
      const next = [...current];
      next[slot] = false;
      return next;
    });
    setGalleryPreviews((current) => {
      const next = [...current];
      if (next[slot].startsWith("blob:")) URL.revokeObjectURL(next[slot]);
      next[slot] = file
        ? URL.createObjectURL(file)
        : settingsQuery.data?.galleryImageSlots.includes(slot)
          ? `${getApiUrl(`/api/v1/organizations/current/gallery/${slot}`)}?v=${Date.now()}`
          : "";
      return next;
    });
    if (file) {
      setGalleryFocusPoint(slot, 50, 50, 100);
      setCropEditorSlot(slot);
    }
    setMessage("");
  }

  function setGalleryFocusPoint(
    slot: 0 | 1,
    focusX: number,
    focusY: number,
    zoom?: number
  ) {
    setGalleryFocus((current) =>
      current.map((item) =>
        item.slot === slot
          ? {
              ...item,
              focusX: Math.round(Math.max(0, Math.min(100, focusX))),
              focusY: Math.round(Math.max(0, Math.min(100, focusY))),
              zoom: Math.round(Math.max(100, Math.min(220, zoom ?? item.zoom)))
            }
          : item
      )
    );
  }

  function removeGalleryImage(slot: 0 | 1) {
    setMessage("");
    const preview = galleryPreviews[slot];
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setGalleryFiles((current) => {
      const next = [...current];
      next[slot] = null;
      return next;
    });
    setGalleryPreviews((current) => {
      const next = [...current];
      next[slot] = "";
      return next;
    });
    setGalleryDeleteSlots((current) => {
      const next = [...current];
      next[slot] = Boolean(settingsQuery.data?.galleryImageSlots.includes(slot));
      return next;
    });
    setGalleryUploadStates((current) => {
      const next = [...current];
      next[slot] = { progress: 0, status: "idle" };
      return next;
    });
    setGalleryFocusPoint(slot, 50, 50, 100);
    setToast("Foto marcada para eliminar. Guardá los cambios para aplicarlo.");
  }

  function cancelEditing() {
    setSettings(savedSettings);
    setLogoFile(null);
    setGalleryFiles([null, null]);
    setGalleryDeleteSlots([false, false]);
    setGalleryUploadStates([
      { progress: 0, status: "idle" },
      { progress: 0, status: "idle" }
    ]);
    setLogoPreview(
      settingsQuery.data?.hasLogo
        ? `${getApiUrl("/api/v1/organizations/current/logo")}?v=${Date.now()}`
        : ""
    );
    setGalleryPreviews([
      settingsQuery.data?.galleryImageSlots.includes(0)
        ? `${getApiUrl("/api/v1/organizations/current/gallery/0")}?v=${Date.now()}`
        : "",
      settingsQuery.data?.galleryImageSlots.includes(1)
        ? `${getApiUrl("/api/v1/organizations/current/gallery/1")}?v=${Date.now()}`
        : ""
    ]);
    setGalleryFocus(
      [0, 1].map((slot) => {
        const saved = settingsQuery.data?.galleryFocus.find((item) => item.slot === slot);
        return {
          slot: slot as 0 | 1,
          focusX: saved?.focusX ?? 50,
          focusY: saved?.focusY ?? 50,
          zoom: saved?.zoom ?? 100
        };
      })
    );
    setMessage("");
    setShowUnsavedState(false);
  }

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5">
      {isOnboarding &&
        sessionQuery.data &&
        !sessionQuery.data.data.user.onboardingGuideSeen && (
          <div className="viewport-overlay modal-overlay-enter z-[110] grid place-items-end bg-[rgba(32,24,54,0.66)] p-3 backdrop-blur-sm sm:place-items-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-guide-title"
              className="modal-panel-enter modal-scroll-panel w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_30px_100px_rgba(32,24,54,0.4)] sm:p-7"
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
      <nav className="grid max-w-6xl grid-cols-2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[rgba(255,251,244,0.86)] p-1 shadow-[0_10px_26px_rgba(32,24,54,0.04)] sm:grid-cols-3 lg:grid-cols-5">
        {([
          ["business", "Negocio", "Negocio", businessIcon],
          ["contact", "Contacto", "Contacto", contactIcon],
          ["page", "Página", "Página pública", pageIcon],
          ["payments", "Cobros", "Cobros", paymentsIcon],
          ["account", "Cuenta", "Cuenta", accountIcon]
        ] as [SettingsTab, string, string, string][]).map(([value, shortLabel, label, icon]) => (
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
            className={`group flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              activeTab === value
                ? "bg-[var(--color-ink)] text-[var(--color-button-text)]"
                : "text-[var(--color-muted-strong)] hover:bg-white/60"
            }`}
          >
            <img
              src={icon}
              alt=""
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 opacity-75 transition duration-200 group-hover:scale-110 ${
                activeTab === value ? "invert" : ""
              }`}
            />
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
                {{
                  business: "Identidad del negocio",
                  contact: "Contacto",
                  page: "Página pública",
                  payments: "Cobros",
                  account: "Cuenta"
                }[activeTab]}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                {{
                  business: "Definí la identidad y presentación principal de tu negocio.",
                  contact: "Configurá canales de contacto, ubicación y redes.",
                  page: "Gestioná el enlace público de reservas.",
                  payments: "Conectá Mercado Pago para cobrar señas online.",
                  account: "Administrá el acceso de tu cuenta."
                }[activeTab]}
              </p>
              </div>
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
                <section className="grid gap-5 rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.68)] p-4 md:col-span-2 lg:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[var(--color-muted-strong)]">
                          Logo del negocio
                        </span>
                        <span className="rounded-full bg-[rgba(32,24,54,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-strong)]">
                          Opcional
                        </span>
                      </div>
                      <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-3">
                        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-white/75 p-2">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Logo del negocio"
                              className="h-full w-full rounded-lg object-contain"
                            />
                          ) : (
                            <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-ink)] text-xl font-semibold text-white">
                              {settings.businessName.charAt(0).toUpperCase() || "+"}
                            </span>
                          )}
                        </div>
                        <label className="grid h-28 cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-white/42 px-3 py-3 text-center hover:border-[var(--color-accent)] hover:bg-white/62">
                          <span>
                            <span className="block text-xl leading-none">↥</span>
                            <span className="mt-2 block text-sm font-semibold text-[var(--color-ink)]">
                              Subí tu logo
                            </span>
                            <span className="mt-1 block text-xs text-[var(--color-muted)]">
                              PNG o JPG, máx. 2MB
                            </span>
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <label className="mt-3 flex min-h-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white/55 px-3 py-2 text-center text-sm font-semibold hover:border-[var(--color-accent)] hover:bg-white/75">
                        <span className="text-base leading-none">✎</span>
                        <span>{logoPreview ? "Cambiar logo" : "Subir logo"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogoChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid min-w-0 content-start gap-4 md:grid-cols-2">
                    <SettingsField
                      label="Nombre del local"
                      maxLength={settingsFieldLimits.businessName}
                      placeholder="Ej: Barbería Central"
                      highlightChanges={showUnsavedState}
                      savedValue={savedSettings.businessName}
                      value={settings.businessName}
                      onChange={(value) => updateSetting("businessName", value)}
                    />
                    <label className="relative grid gap-1.5 text-sm">
                      <span className="font-semibold text-[var(--color-muted-strong)]">
                        Rubro
                      </span>
                      <select
                        value={
                          !settings.category || businessCategories.includes(settings.category)
                            ? settings.category
                            : customBusinessCategory
                        }
                        onChange={(event) => {
                          if (event.target.value === customBusinessCategory) {
                            setCustomCategoryDraft(settings.category);
                            return;
                          }
                          updateSetting("category", event.target.value);
                        }}
                        className={`h-10 rounded-md border bg-white/70 px-3 outline-none ${
                          showUnsavedState &&
                          settings.category !== savedSettings.category
                            ? "border-[#d65a50] focus:border-[#d65a50]"
                            : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)]"
                        }`}
                      >
                        <option value="">Seleccionar rubro</option>
                        {businessCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value={customBusinessCategory}>Otro</option>
                      </select>
                    </label>
                    <label className="relative grid gap-1.5 text-sm md:col-span-2">
                      <span className="font-semibold text-[var(--color-muted-strong)]">
                        Descripción pública
                      </span>
                      <textarea
                        value={settings.description}
                        maxLength={settingsFieldLimits.description}
                        placeholder="Contá brevemente qué servicios ofrece tu negocio."
                        onChange={(event) =>
                          updateSetting("description", event.target.value)
                        }
                        className={`min-h-32 rounded-md border bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-[var(--color-muted)] focus:ring-2 ${
                          showUnsavedState &&
                          settings.description !== savedSettings.description
                            ? "border-[#d65a50] focus:border-[#d65a50] focus:ring-[rgba(214,90,80,0.16)]"
                            : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[rgba(253,134,6,0.2)]"
                        }`}
                      />
                      <span className="text-right text-xs text-[var(--color-muted)]">
                        {settings.description.length}/{settingsFieldLimits.description}
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.72)] p-4 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(32,24,54,0.06)] text-base">
                      ▧
                    </span>
                    <div>
                      <h3 className="font-semibold">Galería del local</h3>
                      <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                        Mostrá tu espacio y el ambiente de tu negocio.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,1fr))_190px]">
                    {([0, 1] as const)
                      .filter((slot) => galleryPreviews[slot])
                      .map((slot) => {
                        const currentFocus =
                          galleryFocus.find((item) => item.slot === slot) ?? {
                            slot,
                            focusX: 50,
                            focusY: 50,
                            zoom: 100
                          };
                        const uploadState = galleryUploadStates[slot] ?? {
                          progress: 0,
                          status: "idle"
                        };
                        const uploadLabel =
                          uploadState.status === "uploading"
                            ? "Optimizando..."
                            : uploadState.status === "done"
                              ? `${formatImageBytes(uploadState.optimizedBytes)}`
                              : uploadState.status === "ready"
                                ? `${formatImageBytes(uploadState.originalBytes)} original`
                                : "";

                        return (
                          <div
                            key={slot}
                            className="group relative aspect-[16/9] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white/50"
                          >
                            <button
                              type="button"
                              onClick={() => setCropEditorSlot(slot)}
                              className="h-full w-full"
                              aria-label={`Ajustar encuadre de foto ${slot + 1}`}
                            >
                              <img
                                src={galleryPreviews[slot]}
                                alt={`Imagen ${slot + 1} del local`}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                style={{
                                  objectPosition: `${currentFocus.focusX}% ${currentFocus.focusY}%`,
                                  transform: `scale(${currentFocus.zoom / 100})`,
                                  transformOrigin: `${currentFocus.focusX}% ${currentFocus.focusY}%`
                                }}
                              />
                            </button>
                            {uploadLabel && uploadState.status !== "done" && (
                              <div className="absolute left-2 right-2 top-2 rounded-lg border border-white/70 bg-white/90 px-2 py-1.5 text-xs font-semibold text-[var(--color-ink)] shadow-sm backdrop-blur">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{uploadLabel}</span>
                                  {uploadState.status === "uploading" && (
                                    <span>{uploadState.progress}%</span>
                                  )}
                                </div>
                                {uploadState.status === "uploading" && (
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(32,24,54,0.1)]">
                                    <div
                                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                                      style={{ width: `${uploadState.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(slot)}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-[var(--color-border)] bg-white/92 text-lg leading-none text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5 hover:border-[#e7b9b2] hover:text-[#9f1f16]"
                              aria-label={`Eliminar foto ${slot + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}

                    {(() => {
                      const emptySlot = ([0, 1] as const).find(
                        (slot) => !galleryPreviews[slot]
                      );
                      if (emptySlot === undefined) return null;

                      return (
                        <label className="grid aspect-[16/9] min-h-28 cursor-pointer place-items-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-white/40 text-center transition hover:border-[var(--color-accent)] hover:bg-white/65">
                          <span>
                            <span className="block text-2xl leading-none text-[var(--color-ink)]">
                              +
                            </span>
                            <span className="mt-2 block text-sm font-semibold text-[var(--color-ink)]">
                              Agregar foto
                            </span>
                            <span className="mt-1 block text-xs text-[var(--color-muted)]">
                              JPG, PNG o WebP, máx. 10MB
                            </span>
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => handleGalleryChange(emptySlot, event)}
                            className="sr-only"
                          />
                        </label>
                      );
                    })()}
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span aria-hidden="true">ⓘ</span>
                    Se recomienda usar fotos horizontales y bien iluminadas.
                  </p>
                </section>
              </>
            )}
            {activeTab === "contact" && (
              <>
            <section className="grid gap-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <span className="text-[var(--color-accent)]">▧</span>
                Canales de contacto
              </div>
              <div className="grid gap-4 md:grid-cols-2">
            <ArgentinaPhoneField
              label="Teléfono"
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.phone}
              value={settings.phone}
              onChange={(value) => updateSetting("phone", value)}
            />
            <ArgentinaPhoneField
              label="WhatsApp"
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.whatsapp}
              value={settings.whatsapp}
              onChange={(value) => updateSetting("whatsapp", value)}
            />
              </div>
            <SettingsField
              label="Email público"
              maxLength={settingsFieldLimits.publicEmail}
              placeholder="Ej: contacto@negocio.com"
              highlightChanges={showUnsavedState}
              savedValue={savedSettings.email}
              value={settings.email}
              onChange={(value) => updateSetting("email", value)}
            />
            </section>

            <section className="grid gap-4 border-t border-[var(--color-border)] pt-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <span className="text-[var(--color-accent)]">⌖</span>
                Ubicación
              </div>
              <SettingsField
                className="md:col-span-2"
                label="Dirección"
                maxLength={settingsFieldLimits.address}
                placeholder="Ej: Av. Corrientes 1234"
                highlightChanges={showUnsavedState}
                savedValue={savedSettings.address}
                value={settings.address}
                onChange={(value) => updateSetting("address", value)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <SettingsField
                  label="Localidad"
                  maxLength={settingsFieldLimits.city}
                  placeholder="Ej: Palermo"
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
                    value={settings.province}
                    onChange={(event) => updateSetting("province", event.target.value)}
                    className={`h-10 rounded-md border bg-white/70 px-3 outline-none ${
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
              </div>
            </section>

            <section className="grid gap-4 border-t border-[var(--color-border)] pt-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                <span className="text-[var(--color-accent)]">◎</span>
                Redes sociales
              </div>
              <SettingsField
                label="Instagram"
                maxLength={settingsFieldLimits.instagram}
                placeholder="Ej: @minegocio"
                highlightChanges={showUnsavedState}
                savedValue={savedSettings.instagram}
                value={settings.instagram}
                onChange={(value) => updateSetting("instagram", value)}
              />
            </section>
              </>
            )}
            {activeTab === "payments" && (
              <>
            <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.78)] md:col-span-2">
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-white/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    Cobros
                  </p>
                  <h3 className="mt-1 text-base font-semibold">Seña online</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                    El cliente paga por Mercado Pago y el dinero entra directo al local.
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    settings.mercadoPagoConnected
                      ? "bg-[#e5f4e8] text-[#1f6b35]"
                      : "bg-[rgba(32,24,54,0.08)] text-[var(--color-muted-strong)]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      settings.mercadoPagoConnected
                        ? "bg-[#4f9a62]"
                        : "bg-[rgba(32,24,54,0.25)]"
                    }`}
                  />
                  {settings.mercadoPagoConnected ? "Conectado" : "Sin conectar"}
                </span>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-semibold text-[var(--color-muted-strong)]">
                    Access Token del local
                  </span>
                  <input
                    value={settings.mercadoPagoAccessToken}
                    onChange={(event) =>
                      updateSetting("mercadoPagoAccessToken", event.target.value)
                    }
                    maxLength={settingsFieldLimits.mercadoPagoAccessToken}
                    placeholder={
                      settings.mercadoPagoConnected
                        ? "Pegá un token nuevo para reemplazar el actual"
                        : "APP_USR-..."
                    }
                    className="h-11 rounded-lg border border-[var(--color-border-strong)] bg-white/75 px-3 text-sm outline-none read-only:cursor-not-allowed read-only:bg-[rgba(32,24,54,0.035)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.16)]"
                    type="password"
                    autoComplete="off"
                  />
                  <span className="text-xs text-[var(--color-muted)]">
                    Se cifra al guardar y nunca se vuelve a mostrar.
                  </span>
                </label>

                <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white/55 p-3">
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>
                      Cobrar seña
                      <span className="mt-0.5 block text-xs font-normal text-[var(--color-muted)]">
                        Reserva el horario solo si se paga.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.depositEnabled}
                      onChange={(event) =>
                        updateSetting("depositEnabled", event.target.checked)
                      }
                      className="h-5 w-5 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed"
                    />
                  </label>
                  <SettingsField
                    label="Monto de seña"
                    prefix="$"
                    placeholder="Ej: 5000"
                    highlightChanges={showUnsavedState}
                    savedValue={savedSettings.depositAmount}
                    value={settings.depositAmount}
                    onChange={(value) => updateSetting("depositAmount", value)}
                  />
                </div>
              </div>

              {settings.mercadoPagoConnected && (
                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] bg-white/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--color-muted)]">
                    Si desconectás Mercado Pago, se desactiva el cobro de seña.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      updateSetting("mercadoPagoConnected", false);
                      updateSetting("depositEnabled", false);
                    }}
                    className="w-fit rounded-lg border border-[#e7b9b2] bg-[#fff8f6] px-3 py-2 text-sm font-semibold text-[#9f1f16] hover:bg-[#fde8e5]"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </section>
              </>
            )}
            {activeTab === "page" && (
              <>
            <SettingsField
              className="md:col-span-2"
              actionHref={`/book/${publicSlug}`}
              label="URL pública"
              prefix="turnosi.com/"
              readOnly
              value={publicSlug}
            />
              </>
            )}
            {hasActiveSectionChanges && (
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-center md:col-span-2">
                {!isOnboarding && (
                  <Button type="button" onClick={cancelEditing} className="w-full sm:w-auto">
                    Descartar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving
                    ? "Guardando..."
                    : ({
                        business: "Guardar negocio",
                        contact: "Guardar contacto",
                        payments: "Guardar cobros",
                        page: "Guardar página",
                        account: "Guardar cambios"
                      }[activeTab])}
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
            <div className="flex items-center gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#2f7d45 ${profileCompletionPercent}%, rgba(32,24,54,0.08) 0)`
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#fffaf4] text-lg font-semibold text-[#2f7d45]">
                  {profileCompletionPercent}%
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {profileCompletionPercent === 100 ? "Perfil completo" : "Perfil en progreso"}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                  {profileCompletionPercent === 100
                    ? "Tu página pública ya tiene lo esencial."
                    : "Completá estos datos para publicar mejor."}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4">
              {profileCompletionItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (activeTab !== item.tab && hasPendingChanges) {
                      setShowUnsavedState(true);
                      setPendingTab(item.tab);
                      return;
                    }
                    setActiveTab(item.tab);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/55"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        item.done
                          ? "bg-[#e3f3e5]"
                          : "bg-[rgba(32,24,54,0.07)]"
                      }`}
                    >
                      <img
                        src={item.icon}
                        alt=""
                        aria-hidden="true"
                        className={`h-4 w-4 ${item.done ? "opacity-80" : "opacity-45"}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                        {item.label}
                      </span>
                      <span className="text-xs text-[var(--color-muted-strong)]">
                        {item.done ? "Completado" : "Pendiente"}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                      item.done
                        ? "border-[#5aa66d] text-[#2f7d45]"
                        : "border-[var(--color-border-strong)] text-[var(--color-muted)]"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-[rgba(253,134,6,0.28)] bg-[rgba(253,134,6,0.07)] p-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {profileCompletionPercent === 100 ? "Todo listo" : "Siguiente paso"}
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-muted-strong)]">
                {profileCompletionPercent === 100
                  ? "Tu perfil está completo y visible para tus clientes."
                  : "Revisá los bloques pendientes antes de compartir tu página."}
              </p>
            </div>
          </CardBody>
        </Card>
      </aside>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} />
      )}
      {customCategoryDraft !== null && (
        <CustomCategoryModal
          value={customCategoryDraft}
          onChange={setCustomCategoryDraft}
          onClose={() => setCustomCategoryDraft(null)}
          onSave={() => {
            const value = customCategoryDraft.trim();
            if (!value) return;
            updateSetting("category", value);
            setCustomCategoryDraft(null);
          }}
        />
      )}
      {pendingTab && (
        <UnsavedChangesModal
          isSaving={isSaving}
          onCancel={() => {
            setShowUnsavedState(false);
            setPendingTab(null);
          }}
          onDiscard={() => {
            if (hasUnsavedChanges) cancelEditing();
            setActiveTab(pendingTab);
            setPendingTab(null);
          }}
          onConfirm={() => {
            const nextTab = pendingTab;
            void saveSettings().then((saved) => {
              if (!saved) return;
              setActiveTab(nextTab);
              setPendingTab(null);
            });
          }}
        />
      )}
      {cropEditorSlot !== null && (
        <GalleryCropModal
          aspectRatio={cropEditorSlot === 0 ? "16 / 10" : "4 / 5"}
          imageUrl={galleryPreviews[cropEditorSlot]}
          onChange={(focusX, focusY, zoom) =>
            setGalleryFocusPoint(cropEditorSlot, focusX, focusY, zoom)
          }
          onClose={() => setCropEditorSlot(null)}
          title={cropEditorSlot === 0 ? "Ajustar foto principal" : "Ajustar foto secundaria"}
          value={
            galleryFocus.find((item) => item.slot === cropEditorSlot) ?? {
              slot: cropEditorSlot,
              focusX: 50,
              focusY: 50,
              zoom: 100
            }
          }
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
  maxLength,
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
  maxLength?: number;
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
      <span className={`flex h-10 min-w-0 overflow-hidden rounded-md border focus-within:ring-2 ${
        changed
          ? "border-[#d65a50] focus-within:border-[#d65a50] focus-within:ring-[rgba(214,90,80,0.16)]"
          : "border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)] focus-within:ring-[rgba(253,134,6,0.2)]"
      } ${
        readOnly ? "bg-[rgba(32,24,54,0.035)]" : "bg-white/70"
      }`}>
        {prefix && (
          <span
            className={`shrink-0 border-r border-[var(--color-border)] px-3 py-2 text-[var(--color-muted)] ${
              readOnly ? "bg-[rgba(32,24,54,0.035)]" : ""
            }`}
          >
            {prefix}
          </span>
        )}
        <input
          list={options ? `settings-${createPublicSlug(label)}` : undefined}
          readOnly={readOnly}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange?.(event.target.value)}
          className={`min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-[var(--color-muted)] ${
            readOnly ? "cursor-not-allowed text-[var(--color-muted-strong)]" : ""
          }`}
        />
        {actionHref && (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className={`shrink-0 border-l border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-ink)] hover:bg-[rgba(253,134,6,0.1)] ${
              readOnly ? "bg-[rgba(32,24,54,0.035)]" : ""
            }`}
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

function ArgentinaPhoneField({
  highlightChanges = false,
  label,
  onChange,
  readOnly = false,
  savedValue,
  value
}: {
  highlightChanges?: boolean;
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  savedValue?: string;
  value: string;
}) {
  const localNumber = getArgentinaPhoneNumber(value);
  const savedLocalNumber = savedValue ? getArgentinaPhoneNumber(savedValue) : undefined;
  const changed =
    highlightChanges && savedLocalNumber !== undefined && localNumber !== savedLocalNumber;

  function updatePhone(nextLocalNumber: string) {
    onChange(normalizeArgentinaPhone(nextLocalNumber));
  }

  return (
    <label className="relative grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--color-muted-strong)]">{label}</span>
      <span
        className={`flex h-10 min-w-0 overflow-hidden rounded-md border focus-within:ring-2 ${
          changed
            ? "border-[#d65a50] focus-within:border-[#d65a50] focus-within:ring-[rgba(214,90,80,0.16)]"
            : "border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)] focus-within:ring-[rgba(253,134,6,0.2)]"
        } ${
          readOnly ? "bg-[rgba(32,24,54,0.035)]" : "bg-white/70"
        }`}
      >
        <span
          className={`inline-flex shrink-0 items-center border-r border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-ink)] ${
            readOnly ? "bg-[rgba(32,24,54,0.035)]" : "bg-white/60"
          }`}
        >
          +54 9
        </span>
        <input
          readOnly={readOnly}
          inputMode="numeric"
          placeholder="11 2345 6789"
          value={localNumber}
          onChange={(event) => updatePhone(event.target.value)}
          className={`min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-[var(--color-muted)] ${
            readOnly
              ? "cursor-not-allowed text-[var(--color-muted-strong)]"
              : ""
          }`}
          maxLength={settingsFieldLimits.phone}
        />
      </span>
    </label>
  );
}

function CustomCategoryModal({
  value,
  onChange,
  onClose,
  onSave
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="viewport-overlay modal-overlay-enter z-[90] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center">
      <section className="modal-panel-enter modal-scroll-panel w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Rubro personalizado
        </p>
        <h2 className="mt-2 text-lg font-semibold">Escribí el rubro del negocio</h2>
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={settingsFieldLimits.category}
          placeholder="Ej: Veterinaria"
          className="mt-4 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-white/80 px-3 outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.18)]"
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" disabled={!value.trim()} onClick={onSave}>
            Guardar rubro
          </Button>
        </div>
      </section>
    </div>
  );
}

function GalleryCropModal({
  aspectRatio,
  imageUrl,
  onChange,
  onClose,
  title,
  value
}: {
  aspectRatio: string;
  imageUrl: string;
  onChange: (focusX: number, focusY: number, zoom: number) => void;
  onClose: () => void;
  title: string;
  value: { focusX: number; focusY: number; zoom: number };
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: value.focusX,
      originY: value.focusY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    const frame = frameRef.current;
    if (!dragState || !frame || dragState.pointerId !== event.pointerId) return;
    const rect = frame.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - dragState.startY) / rect.height) * 100;
    onChange(dragState.originX - deltaX, dragState.originY - deltaY, value.zoom);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="modal-overlay-enter fixed inset-0 z-[120] grid place-items-end bg-[rgba(32,24,54,0.72)] p-3 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        className="modal-panel-enter modal-scroll-panel w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[#fffaf4] p-4 shadow-[0_30px_100px_rgba(32,24,54,0.32)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Arrastrá la imagen y ajustá el zoom como se verá en reservas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border-strong)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Listo
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div
            ref={frameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative overflow-hidden rounded-[1.4rem] border border-[var(--color-border)] bg-[rgba(32,24,54,0.06)] touch-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
            style={{ aspectRatio }}
          >
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              style={{
                objectPosition: `${value.focusX}% ${value.focusY}%`,
                transform: `scale(${value.zoom / 100})`,
                transformOrigin: `${value.focusX}% ${value.focusY}%`
              }}
            />
            <div className="pointer-events-none absolute inset-0 border-[10px] border-[rgba(255,255,255,0.24)]" />
            <div className="pointer-events-none absolute inset-4 rounded-[1rem] border border-white/80 shadow-[0_0_0_9999px_rgba(32,24,54,0.06)]" />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white/72 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Referencia
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              Tamaño sugerido
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted-strong)]">
              {aspectRatio === "16 / 10"
                ? "Foto horizontal, ideal 1600x1000 o mayor."
                : "Foto vertical, ideal 900x1100 o mayor."}
            </p>
            <label className="mt-4 grid gap-2 text-sm font-semibold text-[var(--color-ink)]">
              Zoom
              <input
                type="range"
                min={100}
                max={220}
                value={value.zoom}
                onChange={(event) =>
                  onChange(value.focusX, value.focusY, Number(event.target.value))
                }
                className="accent-[var(--color-accent)]"
              />
              <span className="text-xs font-medium text-[var(--color-muted-strong)]">
                {value.zoom}%
              </span>
            </label>
            <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
              Vista final
            </p>
            <div
              className="mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(32,24,54,0.06)]"
              style={{ aspectRatio }}
            >
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                style={{
                  objectPosition: `${value.focusX}% ${value.focusY}%`,
                  transform: `scale(${value.zoom / 100})`,
                  transformOrigin: `${value.focusX}% ${value.focusY}%`
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function UnsavedChangesModal({
  isSaving,
  onCancel,
  onDiscard,
  onConfirm
}: {
  isSaving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay-enter fixed inset-0 z-[80] grid place-items-end bg-[rgba(32,24,54,0.58)] p-3 backdrop-blur-sm sm:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        className="modal-panel-enter modal-scroll-panel w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]"
      >
        <h2 className="text-lg font-semibold">Tenés cambios sin guardar</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
          Guardá antes de continuar o descartá lo que modificaste.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" disabled={isSaving} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSaving} onClick={onDiscard}>
            Descartar
          </Button>
          <Button type="button" variant="primary" disabled={isSaving} onClick={onConfirm}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
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
    <div className="modal-overlay-enter fixed inset-0 z-50 grid place-items-end bg-[rgba(32,24,54,0.62)] px-3 py-3 backdrop-blur-sm sm:place-items-center">
      <div className="modal-panel-enter modal-scroll-panel w-full max-w-lg rounded-lg border border-[#e7b9b2] bg-[#fffaf4] p-5 shadow-[0_28px_90px_rgba(32,24,54,0.34)]">
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
