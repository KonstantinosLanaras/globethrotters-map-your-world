import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { PromotedPlace } from "@/hooks/usePromotedPlaces";

const TYPE_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  experience: "🎭",
  hotel: "🏨",
};

const PromotedCard = ({ place }: { place: PromotedPlace }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors group"
    >
      {/* Transparency label */}
      <div className="absolute top-2.5 right-3">
        <span className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          Promoted
        </span>
      </div>

      <span className="text-2xl mt-0.5">
        {TYPE_ICONS[place.business_type] || "📍"}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-medium text-foreground group-hover:text-primary transition-colors pr-14 truncate">
          {place.business_name}
        </p>
        {place.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {place.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
            {place.business_type}
          </span>
          {place.website_url && (
            <a
              href={place.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Visit
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PromotedCard;
