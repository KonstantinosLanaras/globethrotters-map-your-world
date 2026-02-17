import { motion } from "framer-motion";

interface AuthenticityMeterProps {
  score: number;
  compact?: boolean;
}

const getLabel = (score: number) => {
  if (score >= 80) return "Highly Authentic";
  if (score >= 60) return "Authentic";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Basic";
  return "Minimal";
};

const getColor = (score: number) => {
  if (score >= 80) return "bg-primary";
  if (score >= 60) return "bg-accent";
  if (score >= 40) return "bg-muted-foreground/50";
  return "bg-muted-foreground/30";
};

const AuthenticityMeter = ({ score, compact = false }: AuthenticityMeterProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`h-full rounded-full ${getColor(score)}`}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{score}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Authenticity</span>
        <span className="text-xs text-muted-foreground">{getLabel(score)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`h-full rounded-full ${getColor(score)}`}
        />
      </div>
    </div>
  );
};

export default AuthenticityMeter;
