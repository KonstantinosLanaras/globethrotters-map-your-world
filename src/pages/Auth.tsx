import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/* ── Hand-drawn globe illustration ── */
const SketchGlobe = () => (
  <svg viewBox="0 0 800 700" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Globe outline — wobbly, hand-drawn feel */}
    <ellipse cx="400" cy="420" rx="240" ry="200"
      stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.12"
      strokeDasharray="4 6" />
    <ellipse cx="400" cy="420" rx="240" ry="200"
      stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.06"
      transform="rotate(12 400 420)" strokeDasharray="3 8" />

    {/* Latitude lines — sketchy */}
    {[-60, -30, 0, 30, 60].map((offset, i) => (
      <ellipse key={`lat-${i}`} cx="400" cy={420 + offset}
        rx={240 - Math.abs(offset) * 1.5} ry={10 + Math.abs(offset) * 0.15}
        stroke="hsl(var(--foreground))" strokeWidth="0.35" opacity={0.08}
        strokeDasharray="2 5" fill="none" />
    ))}

    {/* Longitude curves — sketchy */}
    {[-100, -50, 0, 50, 100].map((offset, i) => (
      <ellipse key={`lng-${i}`} cx={400 + offset} cy="420"
        rx={35 + Math.abs(offset) * 0.1} ry="200"
        stroke="hsl(var(--foreground))" strokeWidth="0.35" opacity={0.07}
        strokeDasharray="3 7" fill="none" />
    ))}

    {/* Abstract landmasses — soft, watercolour-ish */}
    <path d="M290 370 Q320 345 360 350 Q390 335 420 345 Q450 330 475 350 Q490 365 480 380 Q460 395 430 388 Q400 398 370 390 Q340 398 310 385 Q285 378 290 370Z"
      fill="hsl(var(--muted))" opacity="0.35" />
    <path d="M450 400 Q475 385 500 395 Q520 390 525 408 Q520 425 505 430 Q485 432 470 422 Q450 418 450 400Z"
      fill="hsl(var(--muted))" opacity="0.28" />
    <path d="M330 415 Q350 400 370 408 Q385 402 390 415 Q390 435 375 440 Q355 442 340 432 Q325 425 330 415Z"
      fill="hsl(var(--muted))" opacity="0.22" />
    <path d="M380 445 Q400 435 425 440 Q440 438 445 452 Q440 465 425 468 Q405 470 390 460 Q378 455 380 445Z"
      fill="hsl(var(--muted))" opacity="0.2" />

    {/* Tiny pin dots — places visited */}
    {[
      [345, 360, 0.4], [410, 348, 0.35], [465, 358, 0.3],
      [500, 400, 0.25], [365, 412, 0.3], [430, 390, 0.35],
      [395, 450, 0.2], [310, 380, 0.25],
    ].map(([cx, cy, op], i) => (
      <circle key={`pin-${i}`} cx={cx as number} cy={cy as number} r={1.5}
        fill="hsl(var(--primary))" opacity={op as number} />
    ))}

    {/* Walking figure — gender-neutral, poetic, small */}
    <motion.g
      animate={{ x: [0, 5, 0], y: [0, -1.5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Head */}
      <circle cx="398" cy="305" r="3.5" fill="hsl(var(--foreground))" opacity="0.45" />
      {/* Body */}
      <line x1="398" y1="308.5" x2="398" y2="322"
        stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.45" strokeLinecap="round" />
      {/* Arms — one slightly forward */}
      <line x1="398" y1="312" x2="393" y2="318"
        stroke="hsl(var(--foreground))" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <line x1="398" y1="312" x2="403" y2="317"
        stroke="hsl(var(--foreground))" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      {/* Legs — walking stride */}
      <motion.line x1="398" y1="322"
        animate={{ x2: [402, 394, 402], y2: [331, 331, 331] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <motion.line x1="398" y1="322"
        animate={{ x2: [394, 402, 394], y2: [331, 331, 331] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
    </motion.g>

    {/* Dotted trail behind walker */}
    {[360, 370, 380, 388].map((x, i) => (
      <circle key={`trail-${i}`} cx={x} cy={330 + (388 - x) * 0.15} r={0.6}
        fill="hsl(var(--foreground))" opacity={0.08 + i * 0.04} />
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

  const copy = {
    login:  { title: "Welcome back, explorer", sub: "Pick up where you left off" },
    signup: { title: "Start your journey", sub: "Every great adventure begins with a single step" },
    forgot: { title: "Forgot your way?", sub: "No worries — we'll help you get back on the trail" },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Paper texture */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0zM10 10h1v1h-1zM20 0h1v1h-1zM30 10h1v1h-1zM0 20h1v1H0zM10 30h1v1h-1zM20 20h1v1h-1zM30 30h1v1h-1z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Globe illustration — bottom-right, gentle float */}
      <motion.div
        className="absolute bottom-[-5%] right-[-5%] w-[550px] h-[500px] md:w-[750px] md:h-[650px] opacity-50 dark:opacity-25 pointer-events-none"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ transform: "perspective(600px) rotateX(6deg)" }}
      >
        <SketchGlobe />
      </motion.div>

      {/* Warm gradient overlay so form stays readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/60 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center md:justify-start px-6 md:px-16 lg:px-24 py-12">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            /* ── Welcome screen ── */
            <motion.div key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
              className="max-w-md text-center md:text-left"
            >
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="font-body text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-5"
              >
                For curious travellers
              </motion.p>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium text-foreground leading-[1.15] tracking-tight mb-5">
                Your world,
                <br />
                <span className="italic text-primary/80">your story</span>
              </h1>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-body text-muted-foreground text-base leading-relaxed mb-2 max-w-sm"
              >
                A place to collect the experiences that shaped you — not the destinations that impress others.
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-body text-muted-foreground/50 text-sm mb-12"
              >
                No followers. No likes. Just your journey.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
                className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                Begin exploring
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 duration-200" />
              </motion.button>
            </motion.div>
          ) : (
            /* ── Auth form ── */
            <motion.div key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
              className="w-full max-w-[360px] md:ml-[6%]"
            >
              {/* Back */}
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                onClick={() => setShowAuth(false)}
                className="font-body text-[11px] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8 inline-block"
              >
                ← Back
              </motion.button>

              {/* Heading */}
              <AnimatePresence mode="wait">
                <motion.div key={mode}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.25 }}
                  className="mb-8"
                >
                  <h1 className="font-display text-2xl sm:text-3xl font-medium text-foreground tracking-tight leading-snug">
                    {copy[mode].title}
                  </h1>
                  <p className="font-body text-muted-foreground text-sm mt-1.5 leading-relaxed">
                    {copy[mode].sub}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* OAuth */}
              {mode !== "forgot" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2 mb-6"
                >
                  {[
                    {
                      provider: "google" as const,
                      label: "Continue with Google",
                      icon: (
                        <svg className="w-[15px] h-[15px] shrink-0" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      ),
                    },
                    {
                      provider: "apple" as const,
                      label: "Continue with Apple",
                      icon: (
                        <svg className="w-[15px] h-[15px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z"/>
                        </svg>
                      ),
                    },
                  ].map(({ provider, label, icon }) => (
                    <button key={provider} onClick={() => handleOAuth(provider)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-muted-foreground/20 transition-all duration-250 text-[13px] font-body text-foreground"
                    >
                      {icon}
                      {label}
                    </button>
                  ))}

                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="font-body text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50">or with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </motion.div>
              )}

              {/* Form */}
              <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                onSubmit={handleSubmit} className="space-y-4"
              >
                {mode === "signup" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <label className="font-body text-[11px] tracking-[0.08em] uppercase text-muted-foreground mb-1.5 block">Name</label>
                    <input type="text" placeholder="What should we call you?"
                      value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card/30 text-sm font-body text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/30 focus:bg-card/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)] transition-all duration-250"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="font-body text-[11px] tracking-[0.08em] uppercase text-muted-foreground mb-1.5 block">Email</label>
                  <input type="email" placeholder="you@example.com" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-card/30 text-sm font-body text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/30 focus:bg-card/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)] transition-all duration-250"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label className="font-body text-[11px] tracking-[0.08em] uppercase text-muted-foreground mb-1.5 block">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"}
                        placeholder="••••••••" required minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-card/30 text-sm font-body text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/30 focus:bg-card/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)] transition-all duration-250"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <button type="button" onClick={() => setMode("forgot")}
                    className="font-body text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                    Forgot password?
                  </button>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-250 mt-2"
                >
                  {loading ? (
                    <motion.span animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}>
                      One moment…
                    </motion.span>
                  ) : (
                    <>
                      {mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </motion.button>
              </motion.form>

              {/* Toggle */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center font-body text-sm text-muted-foreground mt-7"
              >
                {mode === "forgot" ? (
                  <button onClick={() => setMode("login")} className="text-foreground hover:text-primary transition-colors duration-200">
                    Back to sign in
                  </button>
                ) : mode === "login" ? (
                  <>New to exploring?{" "}
                    <button onClick={() => setMode("signup")} className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                      Join us
                    </button>
                  </>
                ) : (
                  <>Already on the trail?{" "}
                    <button onClick={() => setMode("login")} className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
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
