import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  PasswordRequirementField,
  Toast
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useSessionQuery } from "../auth/auth.queries";
import type { AuthResult } from "../auth/auth.types";
import { queryKeys } from "../../lib/query-keys";
import { changeAccountPassword, updateAccountProfile } from "./account.api";

export function AccountAccessSettings({
  highlightChanges = false,
  onDirtyChange
}: {
  highlightChanges?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "" });
  const [savedProfile, setSavedProfile] = useState({ firstName: "", lastName: "", email: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [toast, setToast] = useState("");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const sessionQuery = useSessionQuery();
  const queryClient = useQueryClient();
  const hasProfileChanges =
    JSON.stringify(profile) !== JSON.stringify(savedProfile);

  useEffect(() => {
    if (sessionQuery.data) {
      const { data } = sessionQuery.data;
      const loadedProfile = {
        firstName: data.user.firstName ?? "",
        lastName: data.user.lastName ?? "",
        email: data.user.email
      };
      // The editable draft intentionally snapshots server state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(loadedProfile);
      setSavedProfile(loadedProfile);
      setIsProfileEditing(false);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    onDirtyChange?.(hasProfileChanges);
    return () => onDirtyChange?.(false);
  }, [hasProfileChanges, onDirtyChange]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProfile) return;
    if (
      profile.firstName === savedProfile.firstName &&
      profile.lastName === savedProfile.lastName &&
      profile.email === savedProfile.email
    ) {
      setToast("No hay cambios por guardar.");
      return;
    }
    setProfileMessage("");
    setIsSavingProfile(true);
    try {
      const response = await updateAccountProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email
      });
      setSavedProfile(profile);
      queryClient.setQueryData<AuthResult>(queryKeys.session, (current) =>
        current
          ? {
              ...current,
              data: { ...current.data, user: response.data }
            }
          : current
      );
      setProfileMessage("");
      setToast("✓ Cambios guardados.");
      setIsProfileEditing(false);
    } catch (error) {
      setProfileMessage(
        error instanceof ApiError && error.code === "EMAIL_ALREADY_IN_USE"
          ? "Ese email ya está registrado."
          : "No pudimos actualizar los datos."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingPassword) return;
    if (!passwords.currentPassword && !passwords.newPassword) {
      setToast("No hay cambios por guardar.");
      return;
    }
    setPasswordMessage("");
    setIsSavingPassword(true);
    try {
      await changeAccountPassword(passwords);
      queryClient.clear();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordMessage(
        error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD"
          ? "La contraseña actual no es correcta."
          : "No pudimos cambiar la contraseña."
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <h2 className="text-base font-semibold">Cuenta y acceso</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
            Estos cambios se guardan independientemente del negocio.
          </p>
          </div>
          {!isProfileEditing && (
            <Button type="button" onClick={() => setIsProfileEditing(true)}>
              Editar datos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-5 p-4 sm:p-5">
        <form
          onSubmit={saveProfile}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] xl:items-end"
        >
          <AccountField
            label="Nombre del propietario"
            placeholder="Ej: Laura"
            disabled={!isProfileEditing}
            highlightChanges={highlightChanges}
            savedValue={savedProfile.firstName}
            value={profile.firstName}
            onChange={(firstName) => setProfile((current) => ({ ...current, firstName }))}
          />
          <AccountField
            label="Apellido del propietario"
            placeholder="Ej: Pérez"
            disabled={!isProfileEditing}
            highlightChanges={highlightChanges}
            savedValue={savedProfile.lastName}
            value={profile.lastName}
            onChange={(lastName) => setProfile((current) => ({ ...current, lastName }))}
          />
          <AccountField
            label="Email de acceso"
            placeholder="Ej: propietario@negocio.com"
            disabled={!isProfileEditing}
            highlightChanges={highlightChanges}
            savedValue={savedProfile.email}
            type="email"
            value={profile.email}
            onChange={(email) => setProfile((current) => ({ ...current, email }))}
          />
          {isProfileEditing && <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1 xl:pl-1">
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={isSavingProfile}
                onClick={() => {
                  setProfile(savedProfile);
                  setIsProfileEditing(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="bg-[var(--color-ink)] text-white"
              >
                {isSavingProfile ? "Guardando..." : "Guardar cuenta"}
              </Button>
            </div>
            {profileMessage && (
              <p className="text-sm text-[var(--color-muted-strong)]">
                {profileMessage}
              </p>
            )}
          </div>}
        </form>

        <form noValidate onSubmit={savePassword} className="grid gap-4 border-t border-[var(--color-border)] pt-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold">Seguridad</p>
            <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
              Cambiar la contraseña cerrará todas las sesiones activas.
            </p>
          </div>
          <AccountField
            label="Contraseña actual"
            placeholder="Ingresá tu contraseña actual"
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(currentPassword) => setPasswords((current) => ({ ...current, currentPassword }))}
          />
          <PasswordRequirementField
            label="Nueva contraseña"
            placeholder="Mínimo 12 caracteres"
            autoComplete="new-password"
            minLength={12}
            value={passwords.newPassword}
            onChange={(event) =>
              setPasswords((current) => ({
                ...current,
                newPassword: event.target.value
              }))
            }
          />
          <div className="flex items-center gap-3 md:col-span-2">
            <Button
              type="submit"
              disabled={isSavingPassword}
              className="w-full sm:w-auto"
            >
              {isSavingPassword ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
            {passwordMessage && <p className="text-sm text-[#b42318]">{passwordMessage}</p>}
          </div>
        </form>
      </CardBody>
      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </Card>
  );
}

function AccountField({
  label,
  autoComplete,
  disabled,
  highlightChanges = false,
  minLength,
  onChange,
  placeholder,
  savedValue,
  type = "text",
  value
}: {
  label: string;
  autoComplete?: string;
  disabled?: boolean;
  highlightChanges?: boolean;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  savedValue?: string;
  type?: string;
  value: string;
}) {
  const changed =
    highlightChanges && savedValue !== undefined && value !== savedValue;

  return (
    <label className="relative grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--color-muted-strong)]">{label}</span>
      <input
        required
        disabled={disabled}
        type={type}
        value={value}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete ?? (type === "email" ? "email" : "name")}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-md border bg-white/70 px-3 py-2 outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:bg-[rgba(32,24,54,0.035)] focus:ring-2 ${
          changed
            ? "border-[#d65a50] focus:border-[#d65a50] focus:ring-[rgba(214,90,80,0.16)]"
            : "border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[rgba(253,134,6,0.2)]"
        }`}
      />
    </label>
  );
}
