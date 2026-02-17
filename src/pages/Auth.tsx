import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/* ── Refined illustrated globe ── */
const IllustratedGlobe = () => (
  <svg viewBox="0 0 600 600" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main globe circle */}
    <circle cx="300" cy="310" r="200"
      stroke="hsl(var(--foreground))" strokeWidth="0.6" opacity="0.1" />
    <circle cx="300" cy="310" r="200"
      stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.05"
      transform="rotate(8 300 310)" />

    {/* Latitude lines */}
    {[-80, -50, -20, 10, 40, 70].map((offset, i) => {
      const y = 310 + offset;
      const rx = Math.sqrt(Math.max(0, 200 * 200 - offset * offset));
      return (
        <ellipse key={`lat-${i}`} cx="300" cy={y} rx={rx} ry={6}
          stroke="hsl(var(--foreground))" strokeWidth="0.3"
          opacity={0.06} fill="none" />
      );
    })}

    {/* Longitude meridians */}
    {[-80, -40, 0, 40, 80].map((offset, i) => (
      <ellipse key={`lng-${i}`} cx={300 + offset} cy="310"
        rx={28} ry="200"
        stroke="hsl(var(--foreground))" strokeWidth="0.3"
        opacity={0.05} fill="none" />
    ))}

    {/* Landmasses — refined, organic shapes */}
    <path d="M220 270 Q248 248 280 255 Q305 242 330 252 Q358 240 378 260 Q390 278 380 292 Q362 305 335 298 Q310 308 285 300 Q258 308 238 295 Q215 282 220 270Z"
      fill="hsl(var(--sand))" opacity="0.5" />
    <path d="M350 310 Q372 296 395 305 Q412 298 418 318 Q414 338 400 342 Q382 345 368 335 Q350 330 350 310Z"
      fill="hsl(var(--sand))" opacity="0.4" />
    <path d="M250 325 Q268 312 288 320 Q300 314 306 328 Q304 348 290 352 Q272 354 260 342 Q246 335 250 325Z"
      fill="hsl(var(--sand))" opacity="0.35" />
    <path d="M295 365 Q312 355 335 360 Q348 358 350 374 Q346 388 332 390 Q314 392 302 382 Q290 375 295 365Z"
      fill="hsl(var(--sand))" opacity="0.3" />

    {/* Small place markers */}
    {[
      [265, 265], [320, 255], [370, 268], [395, 310],
      [278, 328], [340, 300], [310, 370], [240, 288],
      [360, 340], [300, 390],
    ].map(([cx, cy], i) => (
      <circle key={`p-${i}`} cx={cx} cy={cy} r={1.2}
        fill="hsl(var(--primary))" opacity={0.15 + (i % 4) * 0.08} />
    ))}

    {/* Walking figure — minimal, abstract silhouette */}
    <motion.g
      animate={{ x: [0, 4, 0], y: [0, -1, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Head */}
      <circle cx="298" cy="200" r="3" fill="hsl(var(--foreground))" opacity="0.35" />
      {/* Torso */}
      <line x1="298" y1="203" x2="298" y2="216"
        stroke="hsl(var(--foreground))" strokeWidth="0.9" opacity="0.35" strokeLinecap="round" />
      {/* Arms */}
      <line x1="298" y1="207" x2="293.5" y2="213"
        stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
      <line x1="298" y1="207" x2="302.5" y2="212"
        stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
      {/* Legs */}
      <motion.line x1="298" y1="216"
        animate={{ x2: [302, 294, 302], y2: [225, 225, 225] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
      <motion.line x1="298" y1="216"
        animate={{ x2: [294, 302, 294], y2: [225, 225, 225] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.3" strokeLinecap="round" />
    </motion.g>

    {/* Trail dots */}
    {[265, 273, 281, 289].map((x, i) => (
      <circle key={`t-${i}`} cx={x} cy={224 - (289 - x) * 0.08} r={0.5}
        fill="hsl(var(--foreground))" opacity={0.05 + i * 0.03} />
    ))}
  </svg>
);

const Auth = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a password reset link");
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error(String(result.error));
  };

  const heading = {
    login:  { title: "Welcome back", sub: "Continue where you left off" },
    signup: { title: "Create your atlas", sub: "A personal map of the places that matter" },
    forgot: { title: "Reset password", sub: "We'll send you a link to get back in" },
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-card/40 backdrop-blur-sm text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card/70 focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.06),0_1px_3px_hsl(var(--foreground)/0.04)] transition-all duration-300";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle paper grain */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Globe — floating softly */}
      <motion.div
        className="absolute bottom-[-8%] right-[-6%] w-[480px] h-[480px] md:w-[640px] md:h-[640px] lg:w-[720px] lg:h-[720px] pointer-events-none"
        style={{ opacity: 0.55 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full dark:opacity-40" style={{ transform: "perspective(800px) rotateX(8deg)" }}>
          <IllustratedGlobe />
        </div>
      </motion.div>

      {/* Gradient veil for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/50 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center md:justify-start px-6 md:px-20 lg:px-28 py-12">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            /* ── Landing ── */
            <motion.div key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-lg text-center md:text-left"
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-block font-body text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-8"
              >
                Your personal atlas
              </motion.span>

              <h1 className="font-display text-[2.75rem] sm:text-5xl md:text-[3.5rem] font-medium text-foreground leading-[1.1] tracking-tight mb-6">
                Welcome to
                <br />
                <em className="not-italic text-primary/90">Globethrotters</em>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="font-body text-muted-foreground text-[15px] leading-relaxed max-w-[22rem] mb-3"
              >
                Collect the places that shaped you. Build a map of intention, not impression.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="font-body text-muted-foreground/50 text-sm mb-14"
              >
                No feeds. No followers. Just your journey.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02, boxShadow: "0 6px 24px hsl(var(--primary) / 0.18)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAuth(true)}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm shadow-[0_2px_12px_hsl(var(--primary)/0.15)] transition-all duration-300"
              >
                Begin
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </motion.button>
            </motion.div>
          ) : (
            /* ── Auth form ── */
            <motion.div key="auth-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[380px] md:ml-[5%]"
            >
              {/* Back link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                onClick={() => setShowAuth(false)}
                className="font-body text-[11px] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200 mb-10 inline-flex items-center gap-1.5"
              >
                <span className="text-xs">←</span> Back
              </motion.button>

              {/* Title */}
              <AnimatePresence mode="wait">
                <motion.div key={mode}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.3 }}
                  className="mb-9"
                >
                  <h1 className="font-display text-[1.75rem] sm:text-3xl font-medium text-foreground tracking-tight leading-snug">
                    {heading[mode].title}
                  </h1>
                  <p className="font-body text-muted-foreground text-sm mt-2 leading-relaxed">
                    {heading[mode].sub}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Social login */}
              {mode !== "forgot" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2.5 mb-7"
                >
                  <button onClick={() => handleOAuth("google")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-sm hover:bg-card/70 hover:border-muted-foreground/15 hover:shadow-sm transition-all duration-300 text-[13px] font-body text-foreground"
                  >
                    <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                  <button onClick={() => handleOAuth("apple")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/40 backdrop-blur-sm hover:bg-card/70 hover:border-muted-foreground/15 hover:shadow-sm transition-all duration-300 text-[13px] font-body text-foreground"
                  >
                    <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </button>

                  <div className="flex items-center gap-4 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="font-body text-[10px] tracking-[0.18em] uppercase text-muted-foreground/50">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </motion.div>
              )}

              {/* Email form */}
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <AnimatePresence>
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <label className="font-body text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5 block">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="font-body text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label className="font-body text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5 block">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors duration-200"
                      >
                        {showPassword
                          ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                          : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                        }
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="font-body text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                )}

                <div className="pt-1">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01, boxShadow: "0 4px 16px hsl(var(--primary) / 0.2)" }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium shadow-[0_2px_8px_hsl(var(--primary)/0.12)] hover:shadow-[0_4px_16px_hsl(var(--primary)/0.2)] disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? (
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        One moment…
                      </motion.span>
                    ) : (
                      <>
                        {mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>

              {/* Mode toggle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center font-body text-sm text-muted-foreground mt-8"
              >
                {mode === "forgot" ? (
                  <button onClick={() => setMode("login")}
                    className="text-foreground hover:text-primary transition-colors duration-200">
                    Back to sign in
                  </button>
                ) : mode === "login" ? (
                  <>
                    New here?{" "}
                    <button onClick={() => setMode("signup")}
                      className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button onClick={() => setMode("login")}
                      className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                      Sign in
                    </button>
                  </>
                )}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
