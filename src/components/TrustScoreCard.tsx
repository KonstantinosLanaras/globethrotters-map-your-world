import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, BookOpen, Camera, Tag } from "lucide-react";

interface TrustScoreCardProps {
  trustScore: number;
  isVerified: boolean;
}

const getTrustLevel = (score: number) => {
  if (score >= 80) return { label: "Trusted Contributor", icon: <ShieldCheck className="w-4 h-4" /> };
  if (score >= 60) return { label: "Established Traveler", icon: <Sparkles className="w-4 h-4" /> };
  if (score >= 40) return { label: "Active Explorer", icon: <BookOpen className="w-4 h-4" /> };
  return { label: "New Traveler", icon: <Tag className="w-4 h-4" /> };
};

const TrustScoreCard = ({ trustScore, isVerified }: TrustScoreCardProps) => {
  const level = getTrustLevel(trustScore);

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-foreground">Trust & Quality</h3>
        {isVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="text-primary">{level.icon}</div>
        <span className="text-sm font-medium text-foreground">{level.label}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Trust Score</span>
          <span className="text-foreground font-medium">{trustScore}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${trustScore}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Your trust score reflects the depth and authenticity of your travel contributions. Add detailed notes, photos, and specific tags to increase it.
      </p>
    </div>
  );
};

export default TrustScoreCard;
