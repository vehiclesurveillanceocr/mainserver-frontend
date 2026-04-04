"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";

import { auth } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary, isRTL } = useLanguage();
  const copy = dictionary.portalLogin;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await auth.signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message || copy.failed);
      setLoading(false);
      return;
    }

    router.push(searchParams.get("next") ?? "/portal/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 1) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.19 145 / 0.06) 0%, transparent 70%)" }}
      />
      <div className="absolute bottom-1/4 right-1/4 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.17 250 / 0.05) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass glow-primary mb-5">
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-foreground uppercase">
            {dictionary.appName}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-wide">
            {copy.platform}
          </p>
        </div>

        <div className="glass-heavy rounded-2xl p-8">
          <h2 className="text-base font-semibold text-foreground mb-1">{copy.title}</h2>
          <p className="text-xs text-muted-foreground mb-6">{copy.subtitle}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {copy.email}
              </Label>
              <div className="relative">
                <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10", isRTL ? "right-3.5" : "left-3.5")} />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  className={cn(
                    "h-auto bg-input border-border py-3 placeholder:text-muted-foreground/40 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
                    isRTL ? "pr-10" : "pl-10",
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {copy.password}
              </Label>
              <div className="relative">
                <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10", isRTL ? "right-3.5" : "left-3.5")} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  className={cn(
                    "h-auto bg-input border-border py-3 placeholder:text-muted-foreground/40 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
                    isRTL ? "pr-10 pl-11" : "pl-10 pr-11",
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((p) => !p)}
                  className={cn("absolute top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground", isRTL ? "left-1.5" : "right-1.5")}
                  aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3.5 py-2.5">
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className={cn("w-full mt-1 py-3 h-auto", !loading && "glow-primary")}
            >
              {loading ? copy.authenticating : copy.signIn}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          {copy.monitored}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
