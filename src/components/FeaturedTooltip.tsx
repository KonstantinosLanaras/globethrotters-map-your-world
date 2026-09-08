import { useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FeaturedTooltip = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
          <p>These places are highlighted by Globetrotters.</p>
          <p className="mt-1 text-muted-foreground">
            To be featured, experiences must meet quality standards, reach strong ratings, and be approved by local collaborators.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FeaturedTooltip;
