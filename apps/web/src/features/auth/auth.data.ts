export type AuthField = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
};

export type AuthRouteConfig = {
  path: "/login" | "/register";
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  alternateLabel: string;
  alternateHref: string;
  alternateCta: string;
  sideTitle: string;
  sideCopy: string;
  sideItems: readonly string[];
  fields: readonly AuthField[];
};

export const authRoutes: readonly AuthRouteConfig[] = [
  {
    path: "/login",
    eyebrow: "Acceso a la cuenta",
    title: "Iniciá sesión y retomá la agenda de tu negocio.",
    description:
      "Entrá a tu organización para gestionar turnos, revisar disponibilidad y mantener el día ordenado.",
    submitLabel: "Ingresar",
    alternateLabel: "¿Todavía no tenés cuenta?",
    alternateHref: "/register",
    alternateCta: "Crear cuenta",
    sideTitle: "Todo tu equipo, sus horarios y reservas en un mismo lugar.",
    sideCopy:
      "Pensado para manicura, peluquerías, barberías, consultorios y canchas que necesitan una operación clara y profesional.",
    sideItems: [
      "Agenda diaria y disponibilidad",
      "Organizaciones con datos aislados",
      "Roles owner, admin y member"
    ],
    fields: [
      {
        id: "email",
        label: "Email",
        type: "email",
        placeholder: "nombre@negocio.com"
      },
      {
        id: "password",
        label: "Contraseña",
        type: "password",
        placeholder: "Ingresá tu contraseña"
      }
    ]
  },
  {
    path: "/register",
    eyebrow: "Crear cuenta",
    title: "Empezá con una base simple para organizar reservas.",
    description:
      "Creá tu cuenta y dejá listo el espacio inicial para administrar turnos por fecha, hora y responsable.",
    submitLabel: "Crear cuenta",
    alternateLabel: "¿Ya tenés cuenta?",
    alternateHref: "/login",
    alternateCta: "Iniciar sesión",
    sideTitle: "Un sistema adaptable a distintos rubros y formas de trabajo.",
    sideCopy:
      "Podés usarlo para negocios de belleza, servicios por cita o reservas de espacios, con una experiencia consistente desde mobile.",
    sideItems: [
      "Creá la organización inicial",
      "Configurá equipo y horarios",
      "Empezá con una operación ordenada"
    ],
    fields: [
      {
        id: "firstName",
        label: "Nombre",
        type: "text",
        placeholder: "Ej. Cristian"
      },
      {
        id: "lastName",
        label: "Apellido",
        type: "text",
        placeholder: "Ej. Pérez"
      },
      {
        id: "organization",
        label: "Nombre del negocio",
        type: "text",
        placeholder: "Ej. Estudio Norte"
      },
      {
        id: "email",
        label: "Email",
        type: "email",
        placeholder: "nombre@negocio.com"
      },
      {
        id: "password",
        label: "Contraseña",
        type: "password",
        placeholder: "Creá una contraseña"
      }
    ]
  }
];
