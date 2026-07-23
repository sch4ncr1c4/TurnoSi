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
    title: "Iniciá sesión y retomá tu operación.",
    description:
      "Gestioná turnos, equipo y disponibilidad desde tu panel.",
    submitLabel: "Ingresar",
    alternateLabel: "¿Todavía no tenés cuenta?",
    alternateHref: "/register",
    alternateCta: "Crear cuenta",
    sideTitle: "Tu operación diaria en un solo lugar.",
    sideCopy:
      "Agenda, clientes, sedes y equipo conectados para trabajar con más orden.",
    sideItems: [
      "Agenda diaria y disponibilidad",
      "Organizaciones con datos aislados",
      "Roles: propietario, administrador y miembro"
    ],
    fields: [
      {
        id: "email",
        label: "Email o usuario",
        type: "text",
        placeholder: "nombre@negocio.com o juan.ramos"
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
    title: "Creá tu cuenta y configurá tu negocio.",
    description:
      "Empezá con tu organización lista para recibir reservas.",
    submitLabel: "Crear cuenta",
    alternateLabel: "¿Ya tenés cuenta?",
    alternateHref: "/login",
    alternateCta: "Iniciar sesión",
    sideTitle: "Prepará tu negocio para recibir turnos.",
    sideCopy:
      "Configurá datos básicos, horarios y equipo desde una experiencia guiada.",
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
