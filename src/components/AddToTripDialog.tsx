import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useJourneys } from "@/hooks/useJourneys";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plane, Plus, Check } from "lucide-react";

interface AddToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experienceId: string;
  experienceTitle: string;
}

const AddToTripDialog = ({ open, onOpenChange, experienceId, experienceTitle }: AddToTripDialogProps) => {
  const { data: journeys = [] } = useJourneys();
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const handleAdd = async (journeyId: string) => {
    setAdding(journeyId);
    try {
      const { error } = await supabase
        .from("journey_experiences")
        .insert({ journey_id: journeyId, experience_id: experienceId });
      if (error) {
        if (error.code === "23505") {
          toast.info("Already added to this trip");
        } else {
          throw error;
        }
      } else {
        toast.success("Added to trip!");
        setAdded((prev) => new Set(prev).add(journeyId));
        qc.invalidateQueries({ queryKey: ["journey-experiences"] });
      }
    } catch {
      toast.error("Could not add to trip");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Plane className="w-4 h-4 text-primary" />
            Add to Trip
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-3">
          Turn inspiration into plans ✈️ — add "{experienceTitle}" to a trip and organize everything together.
        </p>

        {journeys.length === 0 ? (
          <div className="text-center py-8">
            <Plane className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No trips yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a trip first, then come back to add experiences.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {journeys.map((j) => (
              <button
                key={j.id}
                onClick={() => handleAdd(j.id)}
                disabled={adding === j.id || added.has(j.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 hover:bg-accent/50 transition-all text-left disabled:opacity-60"
              >
                <span className="text-lg">{j.emoji || "✈️"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{j.title}</p>
                  {j.destinations.length > 0 && (
                    <p className="text-[10px] text-muted-foreground truncate">{j.destinations.join(", ")}</p>
                  )}
                </div>
                {added.has(j.id) ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToTripDialog;
