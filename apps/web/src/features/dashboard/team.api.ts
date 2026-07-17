import { apiRequest } from "../../lib/api";

export type TeamMember = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  name: string;
  username: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  bookingsEnabled: boolean;
  visibleInPublicBooking: boolean;
  hourlyCapacity: number;
  branchIds: string[];
  branches: {
    id: string;
    name: string;
    isMain: boolean;
  }[];
  todayAssignedCount: number;
  upcomingAssignedCount: number;
  temporaryPassword: string | null;
  isNewUser: boolean;
};

export type TeamMemberFormData = Pick<
  TeamMember,
  | "firstName"
  | "lastName"
  | "phone"
  | "role"
  | "bookingsEnabled"
  | "visibleInPublicBooking"
  | "hourlyCapacity"
  | "branchIds"
>;

export type CreateTeamMemberData = TeamMemberFormData & {
  username: string;
  password: string;
};

export async function getTeamMembers() {
  const response = await apiRequest<{ success: true; data: TeamMember[] }>(
    "/api/v1/team"
  );
  return response.data;
}

export async function updateTeamMember(
  membershipId: string,
  data: TeamMemberFormData
) {
  const response = await apiRequest<{ success: true; data: TeamMember }>(
    `/api/v1/team/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data)
    }
  );
  return response.data;
}

export async function createTeamMember(data: CreateTeamMemberData) {
  const response = await apiRequest<{ success: true; data: TeamMember }>(
    "/api/v1/team",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );
  return response.data;
}

export async function resetTeamMemberPassword(
  membershipId: string,
  password: string
) {
  return apiRequest<{ success: true; data: { updated: true } }>(
    `/api/v1/team/${membershipId}/password`,
    {
      method: "PATCH",
      body: JSON.stringify({ password })
    }
  );
}
