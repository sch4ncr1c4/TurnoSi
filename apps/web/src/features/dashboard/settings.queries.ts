import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import {
  getOrganizationSettings,
  getOrganizationSettingsSection
} from "./settings.api";
import type { OrganizationSettingsSection } from "./settings.types";

export function useOrganizationSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.organizationSettings,
    queryFn: getOrganizationSettings
  });
}

export function useOrganizationSettingsSectionQuery(
  section: OrganizationSettingsSection
) {
  return useQuery({
    queryKey: queryKeys.organizationSettingsSection(section),
    queryFn: () => getOrganizationSettingsSection(section)
  });
}
