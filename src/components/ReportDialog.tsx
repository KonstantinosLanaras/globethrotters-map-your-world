import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReportDialogProps {
  placeId?: string;
  userId?: string;
  onClose: () => void;
}

const reasons = [
  { value: "spam", label: "Spam or promotional" },
  { value: "misleading", label: "Misleading information" },
  { value: "fake", label: "Fake review" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
] as const;

const ReportDialog = ({ placeId, userId, onClose }: ReportDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !user) return;
    setLoading(true);

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_place_id: placeId || null,
      reported_user_id: userId || null,
      reason,
      details,
    });

    if (error) {
      toast.error("Failed to submit report");
    } else {
      toast.success("Report submitted. Thank you for helping keep our community trustworthy.");
      onClose();
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            <h3 className="font-display text-lg font-semibold text-foreground">Report Content</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {reasons.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                reason === r.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-foreground hover:bg-muted border border-transparent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          placeholder="Additional details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={!reason || loading}
          className="w-full px-4 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ReportDialog;
