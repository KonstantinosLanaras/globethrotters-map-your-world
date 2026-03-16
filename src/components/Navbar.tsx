import { motion } from "framer-motion";
import { Compass, Bookmark, User, Menu, X, Map, MapPin, Utensils, Users, Heart } from "lucide-react";
import GlobethrottersLogo from "@/components/GlobethrottersLogo";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: <Map className="w-4 h-4" />, label: "Map", path: "/" },
  { icon: <Compass className="w-4 h-4" />, label: "Discover", path: "/discover" },
  { icon: <MapPin className="w-4 h-4" />, label: "Places", path: "/places" },
  { icon: <Utensils className="w-4 h-4" />, label: "Activities", path: "/activities" },
  { icon: <Users className="w-4 h-4" />, label: "Travelers", path: "/travelers" },
  { icon: <Heart className="w-4 h-4" />, label: "Wishlist", path: "/wishlist" },
  { icon: <Bookmark className="w-4 h-4" />, label: "Lists", path: "/lists" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between px-6 py-3 bg-card/80 backdrop-blur-xl border-b border-border"
    >
      <button onClick={() => navigate("/")}>
        <GlobethrottersLogo variant="full" size={28} animate={false} className="text-foreground" />
      </button>

      {/* Desktop nav */}
      <div className="hidden lg:flex items-center gap-0.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-body transition-all duration-200 ${
                active
                  ? "text-primary bg-primary/8 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Desktop avatar */}
      <div className="hidden lg:block">
        <button
          onClick={() => navigate("/profile")}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            location.pathname === "/profile"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <User className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        className="lg:hidden w-9 h-9 flex items-center justify-center"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border p-4 lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {[...navItems, { icon: <User className="w-4 h-4" />, label: "Profile", path: "/profile" }].map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-body transition-colors ${
                    active
                      ? "text-primary bg-primary/8 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
