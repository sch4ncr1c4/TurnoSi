import type { AvailabilityTab, AvailabilityTone } from "./availability.types";

export const availabilityTabs: { label: string; value: AvailabilityTab }[] = [
  { label: "Horarios semanales", value: "weekly" },
  { label: "Excepciones y feriados", value: "exceptions" },
  { label: "Servicios y recursos", value: "resources" }
];

export const dayToneClassName: Record<AvailabilityTone, string> = {
  blue: "bg-[#e8f3ff] text-[#1e5f9a]",
  green: "bg-[#eaf6ec] text-[#2f7a45]",
  orange: "bg-[#fff0df] text-[#b85b00]",
  purple: "bg-[#efe9ff] text-[#4d2f9b]",
  red: "bg-[#fde8e5] text-[#b42318]",
  yellow: "bg-[#fff5d8] text-[#8a5a00]"
};

export const insightToneClassName: Record<"blue" | "green" | "orange" | "purple", string> = {
  blue: "bg-[#e8f3ff] text-[#1e5f9a]",
  green: "bg-[#eaf6ec] text-[#2f7a45]",
  orange: "bg-[#fff0df] text-[#b85b00]",
  purple: "bg-[#efe9ff] text-[#4d2f9b]"
};
