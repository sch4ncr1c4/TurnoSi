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
  mercadoPagoConnected: boolean;
  depositEnabled: boolean;
  depositAmountCents: number | null;
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
  completion?: OrganizationSettingsCompletion;
};

export type OrganizationSettingsCompletion = {
  business: boolean;
  contact: boolean;
  page: boolean;
  payments: boolean;
};

export type OrganizationSettingsSectionData = Partial<OrganizationSettings> & {
  completion: OrganizationSettingsCompletion;
};

export type OrganizationSettingsInput = Partial<Omit<
  OrganizationSettings,
  "slug" | "onboardingCompleted" | "hasLogo" | "mercadoPagoConnected"
>> & {
  mercadoPagoAccessToken?: string;
  mercadoPagoDisconnect?: boolean;
};

export type OrganizationSettingsSection =
  | "business"
  | "contact"
  | "page"
  | "payments";
