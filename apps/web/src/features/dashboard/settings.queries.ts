import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import { getOrganizationSettings } from "./settings.api";

export function useOrganizationSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.organizationSettings,
    queryFn: getOrganizationSettings
  });
}
