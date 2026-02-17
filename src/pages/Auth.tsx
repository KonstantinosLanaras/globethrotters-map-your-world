import { useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const WalkerOnGlobe = () => (
  <svg
    viewBox="0 0 800 600"
    className="w-full h-full"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Soft globe */}
    <ellipse
      cx="400"
      cy="380"
      rx="260"
      ry="180"
      stroke="hsl(var(--border))"
      strokeWidth="0.8"
      opacity="0.5"
      fill="none"
    />
    <ellipse
      cx="400"
      cy="380"
      rx="260"
      ry="180"
      stroke="hsl(var(--border))"
      strokeWidth="0.4"
      opacity="0.25"
      fill="none"
      transform="rotate(15 400 380)"
    />
    {/* Latitude lines */}
    {[320, 350, 380, 410, 440].map((y, i) => (
      <ellipse
        key={`lat-${i}`}
        cx="400"
        cy="380"
        rx={260 - Math.abs(y - 380) * 1.2}
        ry={12}
        stroke="hsl(var(--border))"
        strokeWidth="0.4"
        opacity={0.15 + i * 0.05}
        fill="none"
        transform={`translate(0 ${y - 380})`}
      />
    ))}
    {/* Longitude curves */}
    {[-80, -40, 0, 40, 80].map((offset, i) => (
      <ellipse
        key={`lng-${i}`}
        cx={400 + offset}
        cy="380"
        rx="40"
        ry="180"
        stroke="hsl(var(--border))"
        strokeWidth="0.4"
        opacity={0.15 + i * 0.03}
        fill="none"
      />
    ))}
    {/* Continent-like shapes - abstract landmasses */}
    <path
      d="M310 330 Q330 310 360 315 Q380 305 400 310 Q420 300 440 315 Q460 310 470 325 Q475 340 465 350 Q450 360 430 355 Q410 360 390 355 Q370 360 350 350 Q330 355 320 345 Q305 340 310 330Z"
      fill="hsl(var(--muted))"
      opacity="0.3"
    />
    <path
      d="M440 370 Q460 360 480 365 Q500 360 510 375 Q515 390 505 400 Q490 405 475 398 Q460 405 450 395 Q435 385 440 370Z"
      fill="hsl(var(--muted))"
      opacity="0.25"
    />
    <path
      d="M340 385 Q355 375 375 380 Q385 375 390 385 Q395 400 385 410 Q370 415 355 408 Q340 405 340 385Z"
      fill="hsl(var(--muted))"
      opacity="0.2"
    />

    {/* Walking figure - minimal, elegant, disproportionately small */}
    <motion.g
      animate={{ x: [0, 6, 0], y: [0, -2, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Head */}
      <circle cx="395" cy="280" r="4" fill="hsl(var(--foreground))" opacity="0.6" />
      {/* Body */}
      <line x1="395" y1="284" x2="395" y2="296" stroke="hsl(var(--foreground))" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
      {/* Front leg (walking) */}
      <motion.line
        x1="395" y1="296"
        animate={{ x2: [399, 391, 399], y2: [304, 304, 304] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.6" strokeLinecap="round"
      />
      {/* Back leg */}
      <motion.line
        x1="395" y1="296"
        animate={{ x2: [391, 399, 391], y2: [304, 304, 304] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.6" strokeLinecap="round"
      />
      {/* Walking stick */}
      <line x1="399" y1="288" x2="403" y2="304" stroke="hsl(var(--foreground))" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    </motion.g>

    {/* Scattered dots as cities/pins */}
    {[
      [350, 325], [420, 315], [460, 335], [380, 345], [500, 375],
      [330, 350], [450, 380], [370, 395], [410, 400],
    ].map(([cx, cy], i) => (
      <circle
        key={`dot-${i}`}
        cx={cx}
        cy={cy}
        r={1}
        fill="hsl(var(--primary))"
        opacity={0.2 + i * 0.05}
      />
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
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

  const headings = {
    login: { title: "Welcome back", sub: "Continue your journey" },
    signup: { title: "Begin your story", sub: "Your personal atlas awaits" },
    forgot: { title: "Reset password", sub: "We'll send you a link" },
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Illustrated background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Globe illustration - shifted down and right */}
        <motion.div
          className="absolute -bottom-20 -right-20 w-[700px] h-[520px] md:w-[900px] md:h-[670px] opacity-40 dark:opacity-20"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "perspective(800px) rotateX(8deg)" }}
        >
          <WalkerOnGlobe />
        </motion.div>

        {/* Soft radial gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-transparent" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center px-6 md:px-16 lg:px-24 py-12">
        <AnimatePresence mode="wait">
          {!showAuth ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-lg"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="font-body text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6"
              >
                A personal atlas
              </motion.p>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-medium text-foreground leading-[1.1] mb-6 tracking-tight">
                Welcome to
                <br />
                <span className="italic">Globethrotters</span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-sm mb-3"
              >
                The places that shaped you, curated with intention.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="font-body text-muted-foreground/60 text-sm mb-14"
              >
                No feeds. No followers. Just your story.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAuth(true)}
                className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                Begin
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm md:ml-[8%]"
            >
              {/* Back button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                onClick={() => setShowAuth(false)}
                className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10 inline-block"
              >
                ← Back
              </motion.button>

              {/* Heading */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.3 }}
                  className="mb-10"
                >
                  <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground tracking-tight leading-tight">
                    {headings[mode].title}
                  </h1>
                  <p className="font-body text-muted-foreground text-sm mt-2">
                    {headings[mode].sub}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* OAuth */}
              {mode !== "forgot" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2 mb-8"
                >
                  <button
                    onClick={() => handleOAuth("google")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:bg-card hover:border-foreground/10 transition-all duration-300 text-sm font-body text-foreground group"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="transition-colors">Continue with Google</span>
                  </button>
                  <button
                    onClick={() => handleOAuth("apple")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:bg-card hover:border-foreground/10 transition-all duration-300 text-sm font-body text-foreground group"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z"/>
                    </svg>
                    <span className="transition-colors">Continue with Apple</span>
                  </button>

                  <div className="flex items-center gap-4 py-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="font-body text-[11px] tracking-[0.15em] uppercase text-muted-foreground/60">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </motion.div>
              )}

              {/* Form */}
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-3"
              >
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    <label className="font-body text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-1.5 block">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card/40 backdrop-blur-sm text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card/80 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all duration-300"
                    />
                  </motion.div>
                )}

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
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card/40 backdrop-blur-sm text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card/80 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all duration-300"
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
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-card/40 backdrop-blur-sm text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card/80 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="font-body text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <div className="pt-3">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-body font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-300"
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
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>

              {/* Toggle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center font-body text-sm text-muted-foreground mt-8"
              >
                {mode === "forgot" ? (
                  <button onClick={() => setMode("login")} className="text-foreground hover:text-primary transition-colors duration-200">
                    Back to sign in
                  </button>
                ) : mode === "login" ? (
                  <>
                    New here?{" "}
                    <button onClick={() => setMode("signup")} className="text-foreground hover:text-primary transition-colors duration-200 font-medium">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already a traveler?{" "}
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
