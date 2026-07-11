export const bookingRoutePrefix = "/book/";

export const publicOrganization = {
  name: "Estudio Central",
  slug: "estudio-central",
  category: "Belleza, barbería y reservas deportivas",
  address: "Av. San Martín 1420",
  description:
    "Elegí un servicio, seleccioná un día disponible y reservá tu turno sin esperar confirmación manual."
};

export const bookingServices = [
  {
    id: "manicure",
    name: "Semipermanente",
    duration: "60 min",
    price: "$12.000",
    description: "Manicura prolija con esmaltado de larga duración."
  },
  {
    id: "haircut",
    name: "Corte y brushing",
    duration: "75 min",
    price: "$18.000",
    description: "Servicio completo de peluquería con terminación profesional."
  },
  {
    id: "barber",
    name: "Barbería premium",
    duration: "45 min",
    price: "$10.000",
    description: "Corte, perfilado y terminación de barba."
  },
  {
    id: "field",
    name: "Cancha de fútbol",
    duration: "90 min",
    price: "$35.000",
    description: "Reserva de cancha por bloque horario."
  }
] as const;

export const bookingDays = [
  {
    id: "today",
    label: "Hoy",
    date: "Mié 05",
    availability: "6 horarios"
  },
  {
    id: "tomorrow",
    label: "Mañana",
    date: "Jue 06",
    availability: "4 horarios"
  },
  {
    id: "friday",
    label: "Viernes",
    date: "Vie 07",
    availability: "8 horarios"
  },
  {
    id: "saturday",
    label: "Sábado",
    date: "Sáb 08",
    availability: "3 horarios"
  }
] as const;

export const bookingTimes = ["09:00", "10:15", "11:30", "16:00", "17:15", "19:30"] as const;
