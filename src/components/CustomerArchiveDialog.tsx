import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type CustomerArchiveDialogProps = {
  customerId: string;
  customerName: string;
};

export default function CustomerArchiveDialog({ customerId, customerName }: CustomerArchiveDialogProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/fleet/stats"] });
      setOpen(false);
      setLocation("/");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!archiveMutation.isPending) setOpen(nextOpen);
    }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-testid="archive-customer"
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          Archive customer
        </Button>
      </DialogTrigger>
      <DialogContent className="border-destructive/25 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive {customerName}?</DialogTitle>
          <DialogDescription>
            This removes the customer from your account’s active access. Its equipment, readings, and history are retained.
            This does not physically delete those records.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/[0.07] p-3 text-sm leading-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p>After archiving, this customer will no longer be available in your active account workspace.</p>
        </div>
        {archiveMutation.error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {(archiveMutation.error as Error).message || "Customer could not be archived. Try again."}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={archiveMutation.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate()}
            data-testid="confirm-archive-customer"
          >
            {archiveMutation.isPending ? "Archiving…" : "Confirm archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
