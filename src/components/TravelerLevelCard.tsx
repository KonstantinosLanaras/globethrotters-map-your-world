import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { TravelerLevel } from "@/hooks/useTravelerLevel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TravelerLevelCardProps {
  level: TravelerLevel;
}

const TravelerLevelCard = ({ level }: TravelerLevelCardProps) => {
  const earned = level.achievements.filter((a) => a.earned);
  const unearned = level.achievements.filter((a) => !a.earned);
  // Show next unearned achievement as a nudge
  const nextGoal = unearned[0];

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      {/* Level header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-base font-semibold text-foreground">
          {level.title}
        </h3>
        <span className="text-xs text-muted-foreground font-medium">
          {level.totalScore} pts
        </span>
      </div>
      <p className="text-xs text-muted-foreground italic mb-4">
        {level.subtitle}
      </p>

      {/* Progress bar */}
      <div className="mb-1">
        <Progress value={level.progress} className="h-2" />
      </div>
      <p className="text-[10px] text-muted-foreground mb-5">
        {level.progress}% to next level
      </p>

      {/* Achievements */}
      <div className="mb-1">
        <p className="text-xs font-medium text-foreground mb-2.5">
          Achievements · {earned.length}/{level.achievements.length}
        </p>
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-2">
            {level.achievements.map((a) => (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base cursor-default transition-colors ${
                      a.earned
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/50 border border-border opacity-40 grayscale"
                    }`}
                  >
                    {a.icon}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[180px] text-center">
                  <p className="font-medium text-xs">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">{a.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Next goal nudge */}
      {nextGoal && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            <span className="mr-1">{nextGoal.icon}</span>
            <span className="font-medium text-foreground">Next:</span>{" "}
            {nextGoal.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default TravelerLevelCard;
