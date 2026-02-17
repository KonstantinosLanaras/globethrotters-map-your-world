import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md";
}

const VerifiedBadge = ({ isVerified, size = "sm" }: VerifiedBadgeProps) => {
  if (!isVerified) return null;

  const sizeClasses = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      title="Verified Traveler"
    >
      <BadgeCheck className={`${sizeClasses} text-primary`} />
    </motion.span>
  );
};

export default VerifiedBadge;
