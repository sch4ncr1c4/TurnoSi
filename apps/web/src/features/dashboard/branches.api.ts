import { apiRequest } from "../../lib/api";

export type Branch = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
  isMain: boolean;
};

export type BranchDraft = {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  province: string;
};

export async function getBranches() {
  const response = await apiRequest<{ success: true; data: Branch[] }>(
    "/api/v1/organizations/current/branches"
  );
  return response.data;
}

export async function createBranch(draft: BranchDraft) {
  const response = await apiRequest<{ success: true; data: { id: string } }>(
    "/api/v1/organizations/current/branches",
    {
      method: "POST",
      body: JSON.stringify(draft)
    }
  );
  return response.data;
}

export function updateBranch(id: string, draft: BranchDraft) {
  return apiRequest<{ success: true; data: { updated: true } }>(
    `/api/v1/organizations/current/branches/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(draft)
    }
  );
}

export function deleteBranch(id: string) {
  return apiRequest<{ success: true; data: { deleted: true } }>(
    `/api/v1/organizations/current/branches/${id}`,
    { method: "DELETE" }
  );
}
