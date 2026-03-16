import { motion } from "framer-motion";
import { Map, MapPin, Heart, Bookmark, User, Menu, X } from "lucide-react";
import GlobethrottersLogo from "@/components/GlobethrottersLogo";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: <Map className="w-4 h-4" />, label: "Explore", path: "/" },
  { icon: <MapPin className="w-4 h-4" />, label: "Visited", path: "/places" },
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
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between px-5 h-[60px] bg-card/85 backdrop-blur-xl border-b border-border"
    >
      <button onClick={() => navigate("/")} className="flex items-center gap-2">
        <GlobethrottersLogo variant="full" size={26} animate={false} className="text-foreground" />
      </button>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Desktop profile */}
      <div className="hidden md:block">
        <button
          onClick={() => navigate("/profile")}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            location.pathname === "/profile"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <User className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile menu */}
      <button className="md:hidden w-8 h-8 flex items-center justify-center" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border p-3 md:hidden"
        >
          {[...navItems, { icon: <User className="w-4 h-4" />, label: "Profile", path: "/profile" }].map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm transition-colors ${
                  active ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
