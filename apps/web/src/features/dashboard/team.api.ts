import { apiRequest } from "../../lib/api";

export type TeamMember = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  bookingsEnabled: boolean;
  visibleInPublicBooking: boolean;
  hourlyCapacity: number;
  todayAssignedCount: number;
  upcomingAssignedCount: number;
  temporaryPassword: string | null;
  isNewUser: boolean;
};

export async function getTeamMembers() {
  const response = await apiRequest<{ success: true; data: TeamMember[] }>(
    "/api/v1/team"
  );
  return response.data;
}

export async function updateTeamMember(
  membershipId: string,
  data: Pick<
    TeamMember,
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "role"
    | "bookingsEnabled"
    | "visibleInPublicBooking"
    | "hourlyCapacity"
  >
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

export async function createTeamMember(
  data: Pick<
    TeamMember,
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "role"
    | "bookingsEnabled"
    | "visibleInPublicBooking"
    | "hourlyCapacity"
  >
) {
  const response = await apiRequest<{ success: true; data: TeamMember }>(
    "/api/v1/team",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );
  return response.data;
}
