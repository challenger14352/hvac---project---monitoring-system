import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SystemType = "split_ac" | "heat_pump" | "package_unit";
type UnitCreateDialogProps = { customerId: string; defaultTimezone: string };

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export default function UnitCreateDialog({ customerId, defaultTimezone }: UnitCreateDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState<SystemType>("split_ac");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) setTimezone(defaultTimezone);
  }, [defaultTimezone, open]);

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; systemType: SystemType; timezone: string }) => {
      const response = await apiRequest("POST", `/api/customers/${customerId}/units`, body);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/units`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet/stats"] });
      setOpen(false);
      setName("");
      setSystemType("split_ac");
      setTimezone(defaultTimezone);
      setValidationError("");
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (createMutation.isPending) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setName("");
      setSystemType("split_ac");
      setTimezone(defaultTimezone);
      setValidationError("");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    const cleanName = name.trim();
    const cleanTimezone = timezone.trim();
    if (!cleanName) {
      setValidationError("Equipment name is required.");
      return;
    }
    if (cleanName.length > 120) {
      setValidationError("Equipment name must be 120 characters or fewer.");
      return;
    }
    if (!validTimezone(cleanTimezone)) {
      setValidationError("Enter a valid IANA timezone, such as America/New_York.");
      return;
    }
    createMutation.mutate({ name: cleanName, systemType, timezone: cleanTimezone });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11 gap-2" data-testid="add-equipment">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="border-primary/20 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add equipment</DialogTitle>
          <DialogDescription>Register a monitored HVAC system for this customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="equipment-name">Equipment name <span className="text-destructive">*</span></Label>
            <Input id="equipment-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Rooftop unit 1" data-testid="equipment-name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="equipment-system-type">System type</Label>
            <Select value={systemType} onValueChange={(value) => setSystemType(value as SystemType)}>
              <SelectTrigger id="equipment-system-type" className="min-h-11" data-testid="equipment-system-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="split_ac">Split AC</SelectItem>
                <SelectItem value="heat_pump">Heat pump</SelectItem>
                <SelectItem value="package_unit">Packaged unit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="equipment-timezone">Equipment timezone</Label>
            <Input id="equipment-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/New_York" autoComplete="off" data-testid="equipment-timezone" />
            <p className="text-xs text-muted-foreground">Use the location’s IANA timezone. Default: {defaultTimezone}</p>
          </div>
          {(validationError || createMutation.error) && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>{validationError || (createMutation.error as Error).message || "Equipment could not be added. Try again."}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={createMutation.isPending} onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="equipment-save">{createMutation.isPending ? "Adding…" : "Add equipment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
