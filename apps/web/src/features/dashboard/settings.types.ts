export type OrganizationSettings = {
  name: string;
  slug: string;
  category: string;
  phone: string;
  whatsapp: string;
  publicEmail: string;
  address: string;
  city: string;
  province: string;
  instagram: string;
  description: string;
  onboardingCompleted: boolean;
  hasLogo: boolean;
  logoVersion: number | null;
  galleryImageSlots: number[];
  galleryVersions: {
    slot: number;
    version: number;
  }[];
  galleryFocus: {
    slot: number;
    focusX: number;
    focusY: number;
    zoom: number;
  }[];
};

export type OrganizationSettingsInput = Partial<Omit<
  OrganizationSettings,
  "slug" | "onboardingCompleted" | "hasLogo"
>>;
