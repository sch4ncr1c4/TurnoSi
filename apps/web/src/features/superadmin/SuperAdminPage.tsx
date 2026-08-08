import { FormEvent, useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Brand } from "../../components/brand/Brand";
import { Button } from "../../components/ui";
import {
  deleteSuperadminOrganization,
  getSuperadminOrganization,
  getSuperadminOrganizations,
  getSuperadminOverview,
  getSuperadminSession,
  superadminLogin,
  superadminLogout,
  updateSuperadminSubscription,
  type SuperadminSubscriptionActionPayload,
  type SuperadminOrganization
} from "./superadmin.api";

const planLabels = {
  trial: "Prueba",
  initial: "Inicial",
  professional: "Profesional",
  operation: "Operación"
} as const;

const statusLabels = {
  pending: "Pendiente",
  authorized: "Activa",
  paused: "Pausada",
  canceled: "Cancelada"
} as const;

const planOptions = [
  ["trial", "Prueba inicial"],
  ["initial", "Inicial"],
  ["professional", "Profesional"],
  ["operation", "Operación"]
] as const;

const actionLabels = {
  grant: "Asignar plan manual",
  extend: "Extender acceso",
  pause: "Pausar acceso",
  cancel: "Cancelar acceso"
} as const;

function formatDate(value: string | null) {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function money(cents: number | null, currency = "ARS") {
  if (cents === null) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function subscriptionMeta(subscription: SuperadminOrganization["subscription"]) {
  if (!subscription) return "Sin configuración de plan";
  const date =
    subscription.trialEndsAt ??
    subscription.paymentGraceEndsAt ??
    subscription.nextPaymentAt;
  if (!date) {
    return subscription.mercadoPagoPreapprovalId
      ? "Vinculada a Mercado Pago"
      : "Asignación local";
  }
  if (subscription.trialEndsAt) return `Prueba hasta ${formatDate(date)}`;
  if (subscription.paymentGraceEndsAt) return `Gracia hasta ${formatDate(date)}`;
  return `Próximo cobro ${formatDate(date)}`;
}

function memberName(member: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;
}

function SubscriptionPill({
  organization
}: {
  organization: SuperadminOrganization;
}) {
  const subscription = organization.subscription;
  if (!subscription) {
    return <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">Sin plan</span>;
  }
  const isActive = subscription.status === "authorized";
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-[rgba(253,134,6,0.12)] text-[var(--color-accent)]"
      }`}
    >
      {planLabels[subscription.plan]} · {statusLabels[subscription.status]}
    </span>
  );
}

function LoginPanel() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => superadminLogin(email, password),
    onSuccess(data) {
      queryClient.setQueryData(["superadmin", "session"], data);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate();
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-6 text-[var(--color-ink)]">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] max-w-5xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.92)] shadow-[0_24px_80px_rgba(32,24,54,0.12)] lg:grid-cols-[0.86fr_1fr]">
        <div className="relative flex flex-col justify-between overflow-hidden bg-[var(--color-ink)] p-7 text-white sm:p-9">
          <div className="absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(circle_at_20%_40%,rgba(253,134,6,0.22),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.09),transparent_28%)]" />
          <div className="relative z-10 [&_img]:h-14 sm:[&_img]:h-16">
            <Brand boxed />
          </div>
          <div className="relative z-10 my-10 max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Acceso interno
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Panel privado para operar TurnoSi.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/64">
              Gestioná cuentas propietarias, planes manuales, extensiones y bajas desde un único lugar protegido.
            </p>
            <div className="mt-7 grid gap-3 text-sm text-white/72">
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                Sesión aislada con cookie exclusiva de superadmin.
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                Cambios críticos con motivo obligatorio y auditoría.
              </span>
            </div>
          </div>
          <p className="relative z-10 text-xs text-white/42">
            Uso interno. No compartas estas credenciales.
          </p>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <form
            onSubmit={submit}
            className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white/78 p-6 shadow-[0_18px_54px_rgba(32,24,54,0.08)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Superadmin
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Iniciar sesión</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
              Accedé al panel interno de cuentas y planes.
            </p>
            <label className="mt-6 grid gap-1.5 text-sm">
              <span className="font-semibold text-[var(--color-muted-strong)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-lg border border-[var(--color-border-strong)] bg-white/90 px-3 outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.16)]"
                autoComplete="username"
                required
              />
            </label>
            <label className="mt-4 grid gap-1.5 text-sm">
              <span className="font-semibold text-[var(--color-muted-strong)]">
                Contraseña
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-lg border border-[var(--color-border-strong)] bg-white/90 px-3 outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(253,134,6,0.16)]"
                autoComplete="current-password"
                required
              />
            </label>
            {loginMutation.isError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                No pudimos iniciar sesión como superadmin.
              </p>
            ) : null}
            <Button
              type="submit"
              variant="accent"
              disabled={loginMutation.isPending}
              className="mt-5 w-full"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
            <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
              Acceso restringido a operación interna.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

export function SuperAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [subscriptionAction, setSubscriptionAction] =
    useState<SuperadminSubscriptionActionPayload["action"]>("grant");
  const [subscriptionPlan, setSubscriptionPlan] =
    useState<NonNullable<SuperadminSubscriptionActionPayload["plan"]>>("professional");
  const [extensionDays, setExtensionDays] = useState("7");
  const [actionReason, setActionReason] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const sessionQuery = useQuery({
    queryKey: ["superadmin", "session"],
    queryFn: getSuperadminSession,
    retry: false
  });
  const isLoggedIn = Boolean(sessionQuery.data);
  const overviewQuery = useQuery({
    queryKey: ["superadmin", "overview"],
    queryFn: getSuperadminOverview,
    enabled: isLoggedIn
  });
  const organizationsQuery = useQuery({
    queryKey: ["superadmin", "organizations", deferredSearch],
    queryFn: () => getSuperadminOrganizations(deferredSearch),
    enabled: isLoggedIn
  });
  const detailQuery = useQuery({
    queryKey: ["superadmin", "organizations", selectedId],
    queryFn: () => getSuperadminOrganization(selectedId!),
    enabled: isLoggedIn && Boolean(selectedId)
  });
  const logoutMutation = useMutation({
    mutationFn: superadminLogout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: ["superadmin"] });
      setSelectedId(null);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteSuperadminOrganization(selectedId!),
    onSuccess() {
      setSelectedId(null);
      setDeleteConfirmation("");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    }
  });
  const subscriptionMutation = useMutation({
    mutationFn: () => {
      const payload: SuperadminSubscriptionActionPayload = {
        action: subscriptionAction,
        reason: actionReason.trim()
      };
      if (subscriptionAction === "grant") payload.plan = subscriptionPlan;
      if (subscriptionAction === "grant" || subscriptionAction === "extend") {
        const parsedDays = Number(extensionDays);
        if (Number.isFinite(parsedDays) && parsedDays > 0) {
          payload.extensionDays = parsedDays;
        }
      }
      return updateSuperadminSubscription(selectedId!, payload);
    },
    onSuccess() {
      setActionMessage("Cambio aplicado.");
      setActionReason("");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError() {
      setActionMessage("No pudimos aplicar el cambio.");
    }
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] text-sm text-[var(--color-muted-strong)]">
        Verificando acceso...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPanel />;
  }

  const organizations = organizationsQuery.data?.data ?? [];
  const detail = detailQuery.data?.data ?? null;
  const canDelete = Boolean(
    detail && deleteConfirmation.trim().toLowerCase() === detail.name.toLowerCase()
  );
  const canSubmitSubscriptionAction = Boolean(
    selectedId &&
    actionReason.trim().length >= 8 &&
    (subscriptionAction !== "extend" || Number(extensionDays) > 0)
  );

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="bg-[var(--color-bg)] px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[var(--color-ink)] px-4 py-3 text-white shadow-[0_18px_60px_rgba(32,24,54,0.16)] sm:px-5">
          <div className="flex items-center gap-4">
            <div className="[&_*]:text-white [&_img]:h-11 sm:[&_img]:h-12">
            <Brand boxed />
            </div>
            <div className="hidden border-l border-white/12 pl-4 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Panel interno
              </p>
              <p className="mt-1 text-sm text-white/62">
                Gestión de cuentas y operación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-sm">
            <span className="hidden max-w-[220px] truncate px-2 text-white/62 md:inline">
              {sessionQuery.data?.data.email}
            </span>
            <Button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="border-white/15 bg-white/[0.03] px-3 py-2 text-white hover:bg-white/10"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Panel interno
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Cuentas y operación</h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Negocios", overviewQuery.data?.data.organizations],
              ["Cuentas propietarias", overviewQuery.data?.data.ownerAccounts],
              ["Planes activos", overviewQuery.data?.data.activeSubscriptions]
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-2xl border border-[var(--color-border)] bg-white/55 p-4"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{value ?? "-"}</p>
              </article>
            ))}
          </div>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.86)]">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Organizaciones</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                  Buscá por negocio, URL pública, dueño o email.
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cuenta"
                className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm outline-none focus:border-[var(--color-accent)] sm:w-72"
              />
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {organizationsQuery.isLoading ? (
                <p className="p-4 text-sm text-[var(--color-muted-strong)]">
                  Cargando cuentas...
                </p>
              ) : null}
              {!organizationsQuery.isLoading && organizations.length === 0 ? (
                <p className="p-4 text-sm text-[var(--color-muted-strong)]">
                  No encontramos organizaciones.
                </p>
              ) : null}
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(organization.id);
                    setDeleteConfirmation("");
                    setActionMessage("");
                    setActionReason("");
                  }}
                  className={`grid w-full gap-4 p-4 text-left transition hover:bg-white/65 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_auto] ${
                    selectedId === organization.id
                      ? "bg-white shadow-[inset_3px_0_0_var(--color-accent)]"
                      : ""
                  }`}
                >
                  <span>
                    <span className="block font-semibold">{organization.name}</span>
                    <span className="mt-1 block text-sm text-[var(--color-muted-strong)]">
                      /book/{organization.slug}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-muted)]">
                      {organization.location || "Sin ubicación"} · creado {formatDate(organization.createdAt)}
                    </span>
                  </span>
                  <span className="text-sm">
                    <span className="block font-medium">{organization.owner.name}</span>
                    <span className="mt-1 block text-[var(--color-muted-strong)]">
                      {organization.owner.email}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 md:justify-end">
                    <SubscriptionPill organization={organization} />
                    <span className="w-full text-right text-xs text-[var(--color-muted)]">
                      {subscriptionMeta(organization.subscription)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-2xl border border-[var(--color-border)] bg-white/70">
            {!selectedId ? (
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  Detalle
                </p>
                <h2 className="mt-2 text-xl font-semibold">Elegí una cuenta</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
                  Desde acá podés revisar datos, plan, miembros, sedes, pagos y borrar una organización completa.
                </p>
              </div>
            ) : detailQuery.isLoading ? (
              <p className="p-5 text-sm text-[var(--color-muted-strong)]">
                Cargando detalle...
              </p>
            ) : detail ? (
              <div>
                <div className="border-b border-[var(--color-border)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                        Cuenta
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{detail.name}</h2>
                      <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                        {detail.address || "Sin dirección"} · {detail.phone || "Sin teléfono"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <span className="rounded-xl bg-[var(--color-bg)] p-3">
                      <strong className="block text-lg">{detail._count.branches}</strong>
                      sedes
                    </span>
                    <span className="rounded-xl bg-[var(--color-bg)] p-3">
                      <strong className="block text-lg">{detail._count.services}</strong>
                      servicios
                    </span>
                    <span className="rounded-xl bg-[var(--color-bg)] p-3">
                      <strong className="block text-lg">{detail._count.customers}</strong>
                      clientes
                    </span>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <section className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,251,244,0.8)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                          Plan actual
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">
                          {detail.subscription
                            ? planLabels[detail.subscription.plan]
                            : "Sin plan"}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                          {detail.subscription
                            ? `${statusLabels[detail.subscription.status]} · ${subscriptionMeta(detail.subscription)}`
                            : "Todavía no tiene acceso configurado."}
                        </p>
                      </div>
                      {detail.subscription ? <SubscriptionPill organization={detail} /> : null}
                    </div>

                    <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/65 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Acciones internas
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-muted-strong)]">
                        Solo superadmin. Asignar un plan manual no genera pago y desvincula la suscripción local de Mercado Pago.
                      </p>
                      <div className="mt-3 grid gap-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="font-semibold text-[var(--color-muted-strong)]">
                            Acción
                          </span>
                          <select
                            value={subscriptionAction}
                            onChange={(event) => {
                              setSubscriptionAction(
                                event.target.value as SuperadminSubscriptionActionPayload["action"]
                              );
                              setActionMessage("");
                            }}
                            className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 outline-none focus:border-[var(--color-accent)]"
                          >
                            {Object.entries(actionLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        {subscriptionAction === "grant" && (
                          <label className="grid gap-1.5 text-sm">
                            <span className="font-semibold text-[var(--color-muted-strong)]">
                              Plan a asignar
                            </span>
                            <select
                              value={subscriptionPlan}
                              onChange={(event) =>
                                setSubscriptionPlan(
                                  event.target.value as NonNullable<
                                    SuperadminSubscriptionActionPayload["plan"]
                                  >
                                )
                              }
                              className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 outline-none focus:border-[var(--color-accent)]"
                            >
                              {planOptions.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {(subscriptionAction === "extend" ||
                          (subscriptionAction === "grant" &&
                            subscriptionPlan === "trial")) && (
                          <label className="grid gap-1.5 text-sm">
                            <span className="font-semibold text-[var(--color-muted-strong)]">
                              Días de extensión
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={extensionDays}
                              onChange={(event) => setExtensionDays(event.target.value)}
                              className="h-10 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 outline-none focus:border-[var(--color-accent)]"
                            />
                          </label>
                        )}

                        <label className="grid gap-1.5 text-sm">
                          <span className="font-semibold text-[var(--color-muted-strong)]">
                            Motivo interno
                          </span>
                          <textarea
                            value={actionReason}
                            onChange={(event) => setActionReason(event.target.value)}
                            placeholder="Ej: extensión por soporte, cortesía comercial o regularización manual."
                            className="min-h-20 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 outline-none focus:border-[var(--color-accent)]"
                          />
                        </label>

                        {actionMessage && (
                          <p className="rounded-lg bg-[rgba(32,24,54,0.06)] px-3 py-2 text-sm text-[var(--color-muted-strong)]">
                            {actionMessage}
                          </p>
                        )}

                        <Button
                          type="button"
                          variant="accent"
                          disabled={
                            !canSubmitSubscriptionAction ||
                            subscriptionMutation.isPending
                          }
                          onClick={() => subscriptionMutation.mutate()}
                        >
                          {subscriptionMutation.isPending
                            ? "Aplicando..."
                            : "Aplicar cambio"}
                        </Button>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold">Cuenta propietaria</h3>
                    <div className="mt-2 space-y-2">
                      {detail.memberships
                        .filter((membership) => membership.role === "owner")
                        .map((membership) => (
                        <div
                          key={membership.user.id}
                          className="rounded-xl border border-[var(--color-border)] bg-white/55 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{memberName(membership.user)}</span>
                            <span className="capitalize text-[var(--color-muted)]">
                              {membership.role}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--color-muted-strong)]">
                            {membership.user.email}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold">Pagos recientes</h3>
                    <div className="mt-2 space-y-2">
                      {detail.subscriptionPayments.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted-strong)]">
                          Sin pagos registrados.
                        </p>
                      ) : null}
                      {detail.subscriptionPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white/55 p-3 text-sm"
                        >
                          <span>{payment.status}</span>
                          <span className="font-semibold">
                            {money(payment.amountCents, payment.currencyId ?? "ARS")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <h3 className="font-semibold text-red-800">Eliminar organización</h3>
                    <p className="mt-2 text-sm leading-5 text-red-700">
                      Borra negocio, sedes, equipo, turnos, clientes, servicios y pagos locales. Si hay suscripción activa, se cancela en Mercado Pago.
                    </p>
                    <label className="mt-4 grid gap-1.5 text-sm text-red-800">
                      <span>Escribí el nombre exacto para confirmar</span>
                      <input
                        value={deleteConfirmation}
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        className="h-10 rounded-lg border border-red-200 bg-white px-3 outline-none focus:border-red-500"
                        placeholder={detail.name}
                      />
                    </label>
                    {deleteMutation.isError ? (
                      <p className="mt-3 text-sm text-red-700">
                        No pudimos eliminar esta organización.
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      disabled={!canDelete || deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}
                      className="mt-4 w-full border-red-300 text-red-800 hover:bg-red-100"
                    >
                      {deleteMutation.isPending ? "Eliminando..." : "Eliminar definitivamente"}
                    </Button>
                  </section>
                </div>
              </div>
            ) : (
              <p className="p-5 text-sm text-[var(--color-muted-strong)]">
                No pudimos cargar esta cuenta.
              </p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
