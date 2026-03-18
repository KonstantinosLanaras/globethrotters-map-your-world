import { motion, AnimatePresence } from "framer-motion";
import { Map, MapPin, Heart, Bookmark, User, Menu, X, Camera, LogOut, Plane, Compass } from "lucide-react";
import GlobethrottersLogo from "@/components/GlobethrottersLogo";
import PeopleSearch from "@/components/PeopleSearch";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { icon: <Map className="w-4 h-4" />, label: "Explore", path: "/" },
  { icon: <MapPin className="w-4 h-4" />, label: "Visited", path: "/places" },
  { icon: <Heart className="w-4 h-4" />, label: "Wishlist", path: "/wishlist" },
  { icon: <Bookmark className="w-4 h-4" />, label: "Lists", path: "/lists" },
  { icon: <Camera className="w-4 h-4" />, label: "Experiences", path: "/experiences" },
  { icon: <Plane className="w-4 h-4" />, label: "Journeys", path: "/journeys" },
  { icon: <Compass className="w-4 h-4" />, label: "Discover", path: "/discover" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    setMenuOpen(false);
    await signOut();
    navigate("/auth");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-[1001] flex items-center justify-between px-4 h-[60px] bg-card/85 backdrop-blur-xl border-b border-border gap-2"
    >
      <button onClick={() => navigate("/")} className="flex items-center gap-2 flex-shrink-0">
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
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

      {/* People search + profile dropdown */}
      <div className="hidden md:flex items-center gap-2">
        <PeopleSearch />
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              location.pathname === "/profile" || profileOpen
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <User className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <button
                  onClick={() => { navigate("/profile"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
                <div className="h-px bg-border" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          <div className="mb-3 px-1">
            <PeopleSearch />
          </div>

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

          <div className="h-px bg-border my-1" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
