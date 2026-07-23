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
      "Encontrá rápido qué turno sigue, quién atiende y qué estados requieren acción.",
    meta: "Calendario claro",
    tone: "warm"
  },
  {
    title: "Reservas online",
    description:
      "El cliente elige sede, servicio, profesional y horario desde tu página pública.",
    meta: "Canal público",
    tone: "accent"
  },
  {
    title: "Equipo y roles",
    description:
      "Asigná personas por sede y limitá qué puede tocar cada rol dentro del negocio.",
    meta: "Acceso por rol",
    tone: "ink"
  },
  {
    title: "Clientes",
    description:
      "Tené a mano historial, próximos turnos y datos de contacto sin buscar chats.",
    meta: "Ficha completa",
    tone: "soft"
  },
  {
    title: "Recordatorios",
    description:
      "Mandá mensajes claros por WhatsApp para confirmar o recordar la reserva.",
    meta: "Menos ausencias",
    tone: "status"
  },
  {
    title: "Reportes y control",
    description:
      "Leé turnos, ausencias y actividad para decidir horarios, equipo y servicios.",
    meta: "Datos reales",
    tone: "muted"
  }
] as const;

export const previewRows = [
  {
    time: "09:00",
    service: "Corte de pelo",
    customer: "Juan Pérez",
    responsible: "Cristian Schinocca",
    status: "Confirmado"
  },
  {
    time: "10:30",
    service: "Barba completa",
    customer: "Martín Ramos",
    responsible: "Lucas Medina",
    status: "Pagado"
  },
  {
    time: "12:00",
    service: "Corte + barba",
    customer: "Diego Torres",
    responsible: "Mejor disponibilidad",
    status: "En espera"
  },
  {
    time: "17:30",
    service: "Perfilado",
    customer: "Nicolás Silva",
    responsible: "Cristian Schinocca",
    status: "Confirmado"
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
