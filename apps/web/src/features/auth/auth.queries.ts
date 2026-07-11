import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../lib/query-keys";
import { getCurrentSession } from "./auth.api";

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: getCurrentSession
  });
}
