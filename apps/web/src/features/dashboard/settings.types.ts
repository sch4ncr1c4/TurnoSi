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
};

export type OrganizationSettingsInput = Partial<Omit<
  OrganizationSettings,
  "slug" | "onboardingCompleted" | "hasLogo"
>>;
