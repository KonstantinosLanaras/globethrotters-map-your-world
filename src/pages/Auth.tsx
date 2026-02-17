import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/* ── Refined illustrated globe — based on founder's sketch ── */
const IllustratedGlobe = () => (
  <svg viewBox="0 0 600 620" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Globe circle */}
    <circle cx="300" cy="340" r="210"
      stroke="hsl(var(--foreground))" strokeWidth="1.5" opacity="0.22" />
    <circle cx="300" cy="340" r="210"
      stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.1"
      strokeDasharray="3 5" />

    {/* Latitude lines */}
    {[-120, -70, -25, 25, 70, 120].map((offset, i) => {
      const y = 340 + offset;
      const rx = Math.sqrt(Math.max(0, 210 * 210 - offset * offset));
      return (
        <ellipse key={`lat-${i}`} cx="300" cy={y} rx={rx} ry={6}
          stroke="hsl(var(--foreground))" strokeWidth="0.5"
          opacity={0.1} fill="none" />
      );
    })}

    {/* Longitude meridians */}
    {[-100, -50, 0, 50, 100].map((offset, i) => (
      <ellipse key={`lng-${i}`} cx={300 + offset * 0.6} cy="340"
        rx={30} ry="210"
        stroke="hsl(var(--foreground))" strokeWidth="0.5"
        opacity={0.08} fill="none" />
    ))}

    {/* Continents — clear outlines, hand-drawn style */}
    {/* Europe — Iberia, Italy boot, Scandinavia hint */}
    <path d="M275 258 Q280 250 290 248 L298 250 Q305 247 312 249 L320 248 Q330 245 340 250 Q348 255 350 262 Q352 270 348 278 L345 284 Q340 290 332 292 Q325 290 318 288 L310 290 Q302 294 295 292 Q288 296 280 290 Q274 284 272 276 Q270 268 275 258Z"
      fill="hsl(var(--sand))" fillOpacity="0.35" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeOpacity="0.35" strokeLinejoin="round" />
    {/* Africa — triangular, wider north, tapers south */}
    <path d="M288 305 Q295 300 305 298 Q315 297 325 300 Q335 298 342 308 L345 320 Q348 335 345 350 Q342 362 335 372 Q328 380 318 383 Q308 384 300 380 Q293 375 290 365 L287 350 Q283 338 284 325 Q285 315 288 305Z"
      fill="hsl(var(--sand))" fillOpacity="0.3" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeOpacity="0.3" strokeLinejoin="round" />
    {/* North America — broad, recognizable */}
    <path d="M172 270 Q180 258 192 255 Q202 258 210 265 Q218 272 220 282 L218 295 Q216 310 210 322 Q205 332 198 340 Q190 348 182 345 Q175 340 170 330 L168 315 Q165 300 167 285Z"
      fill="hsl(var(--sand))" fillOpacity="0.28" stroke="hsl(var(--foreground))" strokeWidth="1.1" strokeOpacity="0.28" strokeLinejoin="round" />
    {/* Central America bridge */}
    <path d="M198 345 Q202 348 205 355 Q203 362 198 365 Q194 360 195 352Z"
      fill="hsl(var(--sand))" fillOpacity="0.2" stroke="hsl(var(--foreground))" strokeWidth="0.8" strokeOpacity="0.22" strokeLinejoin="round" />
    {/* South America */}
    <path d="M195 365 Q205 358 212 365 Q218 375 216 388 Q212 400 205 408 Q198 412 190 406 Q184 398 182 386 Q182 375 188 368Z"
      fill="hsl(var(--sand))" fillOpacity="0.25" stroke="hsl(var(--foreground))" strokeWidth="1.1" strokeOpacity="0.25" strokeLinejoin="round" />
    {/* Asia — large mass, with subcontinent */}
    <path d="M352 258 Q362 252 375 254 Q388 252 400 258 Q412 265 418 275 Q422 288 418 300 Q412 310 402 315 Q392 320 380 318 Q370 322 360 316 Q352 310 348 300 Q345 290 346 278 Q348 268 352 258Z"
      fill="hsl(var(--sand))" fillOpacity="0.28" stroke="hsl(var(--foreground))" strokeWidth="1.1" strokeOpacity="0.28" strokeLinejoin="round" />
    {/* India subcontinent */}
    <path d="M378 320 Q385 318 390 325 Q392 335 388 342 Q382 346 378 340 Q374 332 378 320Z"
      fill="hsl(var(--sand))" fillOpacity="0.2" stroke="hsl(var(--foreground))" strokeWidth="0.8" strokeOpacity="0.22" strokeLinejoin="round" />
    {/* Australia */}
    <path d="M388 378 Q398 370 410 372 Q420 376 424 386 Q425 396 420 404 Q412 410 402 408 Q392 404 388 396 Q385 388 388 378Z"
      fill="hsl(var(--sand))" fillOpacity="0.22" stroke="hsl(var(--foreground))" strokeWidth="1" strokeOpacity="0.25" strokeLinejoin="round" />

    {/* Place markers */}
    {[
      { x: 295, y: 268, label: "London" },
      { x: 340, y: 280, label: "" },
      { x: 195, y: 290, label: "NYC" },
      { x: 380, y: 275, label: "" },
      { x: 310, y: 340, label: "" },
      { x: 200, y: 375, label: "" },
      { x: 405, y: 385, label: "" },
      { x: 250, y: 300, label: "" },
    ].map(({ x, y, label }, i) => (
      <g key={`marker-${i}`}>
        <circle cx={x} cy={y} r={2.5}
          fill="hsl(var(--primary))" opacity={0.4 + (i % 3) * 0.1} />
        <line x1={x} y1={y - 2} x2={x} y2={y - 8}
          stroke="hsl(var(--primary))" strokeWidth="0.8" opacity={0.35} />
        {label && (
          <text x={x + 5} y={y - 4} fontSize="7"
            fontFamily="var(--font-body)" fill="hsl(var(--foreground))" opacity="0.3">
            {label}
          </text>
        )}
      </g>
    ))}

    {/* Walking figure */}
    <motion.g
      animate={{ x: [0, 5, 0], y: [0, -2, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="300" cy="100" r="10" fill="hsl(var(--foreground))" opacity="0.5" />
      <line x1="300" y1="110" x2="300" y2="116"
        stroke="hsl(var(--foreground))" strokeWidth="2" opacity="0.45" strokeLinecap="round" />
      <line x1="300" y1="116" x2="300" y2="148"
        stroke="hsl(var(--foreground))" strokeWidth="2.5" opacity="0.45" strokeLinecap="round" />
      <motion.line x1="300" y1="122"
        animate={{ x2: [288, 312, 288], y2: [138, 136, 138] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="1.8" opacity="0.4" strokeLinecap="round" />
      <motion.line x1="300" y1="122"
        animate={{ x2: [312, 288, 312], y2: [136, 138, 136] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="1.8" opacity="0.4" strokeLinecap="round" />
      <motion.line x1="300" y1="148"
        animate={{ x2: [314, 286, 314], y2: [170, 170, 170] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <motion.line x1="300" y1="148"
        animate={{ x2: [286, 314, 286], y2: [170, 170, 170] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <rect x="302" y="118" width="6" height="10" rx="2"
        fill="hsl(var(--foreground))" opacity="0.25" />
    </motion.g>

    {/* Footstep trail */}
    {[260, 268, 276, 284, 292].map((x, i) => (
      <circle key={`step-${i}`} cx={x} cy={172 - i * 0.8} r={1}
        fill="hsl(var(--foreground))" opacity={0.08 + i * 0.04} />
    ))}

    {/* Horizon line */}
    <line x1="80" y1="555" x2="520" y2="555"
      stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.1"
      strokeDasharray="2 4" />
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
        style={{ opacity: 0.9 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full dark:opacity-60" style={{ transform: "perspective(800px) rotateX(8deg)" }}>
          <IllustratedGlobe />
        </div>
      </motion.div>

      {/* Gradient veil for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-transparent pointer-events-none" />

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
