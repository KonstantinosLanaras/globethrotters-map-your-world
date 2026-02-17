import { motion } from "framer-motion";
import { MapPin, Globe, Compass, User, Search, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-xl border-b border-border"
    >
      <div className="flex items-center gap-2">
        <Globe className="w-6 h-6 text-primary" />
        <span className="font-display text-xl font-semibold text-foreground tracking-tight">
          Globethrotters
        </span>
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-8 text-sm font-body">
        <NavItem icon={<Compass className="w-4 h-4" />} label="Explore" active />
        <NavItem icon={<MapPin className="w-4 h-4" />} label="My Map" />
        <NavItem icon={<Search className="w-4 h-4" />} label="Discover" />
      </div>

      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
          <span className="text-xs font-medium text-primary">Cultural Curator</span>
        </div>
        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        className="md:hidden w-9 h-9 flex items-center justify-center"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border p-4 md:hidden"
        >
          <div className="flex flex-col gap-3 text-sm font-body">
            <NavItem icon={<Compass className="w-4 h-4" />} label="Explore" active />
            <NavItem icon={<MapPin className="w-4 h-4" />} label="My Map" />
            <NavItem icon={<Search className="w-4 h-4" />} label="Discover" />
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

const NavItem = ({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) => (
  <button
    className={`flex items-center gap-1.5 transition-colors ${
      active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Navbar;
