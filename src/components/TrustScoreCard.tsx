import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, BookOpen, Tag, Users, Heart } from "lucide-react";

interface TrustScoreCardProps {
  trustScore: number;
  isVerified: boolean;
  validatedScore?: number;
  travelersHelped?: number;
  contributionCount?: number;
}

const getTrustLevel = (score: number) => {
  if (score >= 80) return { label: "Trusted Contributor", icon: <ShieldCheck className="w-4 h-4" />, color: "text-primary" };
  if (score >= 60) return { label: "Established Traveler", icon: <Sparkles className="w-4 h-4" />, color: "text-primary" };
  if (score >= 40) return { label: "Active Explorer", icon: <BookOpen className="w-4 h-4" />, color: "text-primary" };
  return { label: "New Traveler", icon: <Tag className="w-4 h-4" />, color: "text-muted-foreground" };
};

const TrustScoreCard = ({ trustScore, isVerified, validatedScore = 0, travelersHelped = 0, contributionCount = 0 }: TrustScoreCardProps) => {
  const level = getTrustLevel(trustScore);

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-foreground">Trust & Impact</h3>
        {isVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className={level.color}>{level.icon}</div>
        <span className="text-sm font-medium text-foreground">{level.label}</span>
      </div>

      {/* Impact metrics instead of raw score */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">{travelersHelped}</p>
          <p className="text-[9px] text-muted-foreground">Travelers helped</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <div className="flex items-center justify-center mb-1">
            <Heart className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">{validatedScore}</p>
          <p className="text-[9px] text-muted-foreground">Impact score</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <div className="flex items-center justify-center mb-1">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">{contributionCount}</p>
          <p className="text-[9px] text-muted-foreground">Contributions</p>
        </div>
      </div>

      {/* Trust bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Community trust</span>
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
        Your trust grows when other travelers find your contributions helpful, save your experiences, or validate your insights.
      </p>
    </div>
  );
};

export default TrustScoreCard;
