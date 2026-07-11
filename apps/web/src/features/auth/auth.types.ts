export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  onboardingGuideSeen: boolean;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  role?: "owner" | "admin" | "member";
  onboardingCompleted?: boolean;
  hasLogo?: boolean;
};

export type AuthResult = {
  success: true;
  data: {
    user: AuthUser;
    organization?: AuthOrganization;
    organizations?: AuthOrganization[];
  };
};
