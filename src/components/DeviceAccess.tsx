import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mounted only for signed-in, real units; never mount inside the public demo.
export function DeviceAccess({ unitId }: { unitId: string }) {
  const client = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const key = [`/api/units/${unitId}/device-credential`];
  const { data, isLoading, error } = useQuery<{ active: boolean; createdAt: string | null }>({ queryKey: key });
  const action = useMutation({
    mutationFn: async (method: "POST" | "DELETE") => {
      setToken(null);
      const response = await apiRequest(method, key[0], {});
      return response.json() as Promise<{ token?: string }>;
    },
    onSuccess: (result) => {
      setToken(result.token ?? null);
      client.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>ESP32 device access</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect validated hardware to this unit only. A device token cannot open your account.
          Current-only uploads do not establish overall HVAC health.
        </p>
        <p className="text-sm">Unit ID: <code className="break-all">{unitId}</code></p>
        <p className="text-sm" role="status">{isLoading ? "Checking device access…" : error ? "Could not load device access." : data?.active ? "Device token active" : "No active device token"}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={isLoading || !!error || action.isPending} onClick={() => {
            if (!data?.active || window.confirm("Replace this unit's device token? The connected device will stop uploading until you install the new token.")) action.mutate("POST");
          }}>{data?.active ? "Replace device token" : "Create device token"}</Button>
          <Button variant="outline" disabled={!data?.active || action.isPending} onClick={() => {
            if (window.confirm("Revoke device access? Uploads will stop. Existing readings will be kept.")) action.mutate("DELETE");
          }}>Revoke device access</Button>
        </div>
        {action.error && <p role="alert" className="text-sm text-destructive">{action.error.message}</p>}
        {token && (
          <div className="space-y-2 rounded border border-primary p-3">
            <p className="text-sm">Save this secret now; it cannot be retrieved again. Do not share it, put it in a screenshot, or commit it to Git.</p>
            <label className="block text-sm">Device token
              <input aria-label="Device token" readOnly value={token} className="mt-1 w-full rounded bg-background p-2 font-mono text-sm" onFocus={(event) => event.target.select()} />
            </label>
            <Button variant="outline" onClick={() => setToken(null)}>Hide token</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
