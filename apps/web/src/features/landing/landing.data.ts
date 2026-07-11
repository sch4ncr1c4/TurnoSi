export const sectors = [
  "Manicura",
  "Peluquerías",
  "Barberías",
  "Consultorios",
  "Canchas",
  "Estudios"
] as const;

export const featureCards = [
  {
    title: "Agenda inteligente",
    description:
      "Visualizá el día, la semana o el mes con lectura rápida y foco en el turno activo.",
    meta: "Calendario claro",
    tone: "warm"
  },
  {
    title: "Reservas online",
    description:
      "Tus clientes se agendan solos desde la página pública del local, sin llamadas ni idas y vueltas.",
    meta: "Canal público",
    tone: "accent"
  },
  {
    title: "Equipo y roles",
    description:
      "Organizá miembros por sede y prepará la base para owner, admin y member.",
    meta: "Acceso por rol",
    tone: "ink"
  },
  {
    title: "Clientes",
    description:
      "Conservá historial, observaciones y próximos turnos para dar seguimiento sin perder contexto.",
    meta: "Ficha completa",
    tone: "soft"
  },
  {
    title: "Recordatorios",
    description:
      "Reducí ausencias con avisos automáticos y mensajes claros antes del turno.",
    meta: "Menos ausencias",
    tone: "status"
  },
  {
    title: "Reportes y control",
    description:
      "Leé ocupación, turnos confirmados y actividad reciente sin agregar complejidad innecesaria.",
    meta: "Datos reales",
    tone: "muted"
  }
] as const;

export const resourceCards = [
  {
    title: "Centro de ayuda",
    description:
      "Respuestas claras para resolver dudas frecuentes sin perder tiempo."
  },
  {
    title: "Documentación",
    description:
      "Guías para configurar el sistema y entender cada parte de la operación."
  },
  {
    title: "API e integraciones",
    description:
      "Conectá TurnoSi con otras herramientas cuando el negocio lo necesite."
  },
  {
    title: "Blog",
    description:
      "Consejos y novedades para ordenar mejor la agenda y la atención."
  },
  {
    title: "Estado del sistema",
    description:
      "Seguimiento de disponibilidad y cambios importantes en la plataforma."
  }
] as const;

export const pricingPlans = [
  {
    id: "initial",
    name: "Inicial",
    price: "$12.000",
    period: "/mes",
    description: "Para negocios que empiezan a ordenar sus reservas online.",
    features: ["1 organización", "Agenda pública", "Hasta 3 miembros"],
    highlighted: false
  },
  {
    id: "professional",
    name: "Profesional",
    price: "$24.000",
    period: "/mes",
    description: "Para equipos con operación diaria y volumen real de turnos.",
    features: ["Miembros ilimitados", "Estados y auditoría", "Soporte prioritario"],
    highlighted: true
  },
  {
    id: "operation",
    name: "Operación",
    price: "$39.000",
    period: "/mes",
    description: "Para locales con varias sedes o una agenda más exigente.",
    features: ["Multi-sede", "Reportes avanzados", "Configuración extendida"],
    highlighted: false
  }
] as const;

export const previewRows = [
  {
    time: "09:00",
    title: "Color y corte",
    meta: "Lucia · Box 2"
  },
  {
    time: "11:30",
    title: "Semipermanente",
    meta: "Camila · Mesa 1"
  },
  {
    time: "18:00",
    title: "Cancha 5",
    meta: "Turno confirmado"
  }
] as const;

export const landingMetrics = [
  {
    value: "18",
    label: "turnos visibles en el día"
  },
  {
    value: "6",
    label: "espacios disponibles"
  },
  {
    value: "3",
    label: "roles preparados"
  }
] as const;

export const trustLogos = [
  "Estudio Norte",
  "Club Once",
  "Salon Distrito",
  "Cancha Sur",
  "Studio Lumen",
  "Barber Lab"
] as const;
