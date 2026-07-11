export type AvailabilityTab = "weekly" | "exceptions" | "resources";

export type AvailabilityTone = "blue" | "green" | "orange" | "purple" | "red" | "yellow";

export type AvailabilitySlot = {
  start: string;
  end: string;
};

export type WeeklyAvailabilityDay = {
  day: string;
  shortDay: string;
  enabled: boolean;
  tone: AvailabilityTone;
  slots: AvailabilitySlot[];
  break: AvailabilitySlot | null;
  status: string;
};

export type AvailabilityException = {
  id?: string;
  date: string;
  title: string;
  detail: string;
  status: string;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
};

export type AvailabilityResource = {
  id?: string;
  name: string;
  duration: string;
  capacity: string;
  price: string;
  resource: string;
  online: boolean;
  buffer: string;
};

export type AvailabilityPanel =
  | { type: "exception"; index: number }
  | { type: "rules"; index: number }
  | { type: "resources"; index: number }
  | null;
