import { useQuery } from "@tanstack/react-query";
import type { WorkspaceSettings } from "@shared/workspace";

export function useWorkspaceSettings(enabled = true) {
  return useQuery<WorkspaceSettings>({
    queryKey: ["/api/account/settings"],
    enabled,
  });
}
