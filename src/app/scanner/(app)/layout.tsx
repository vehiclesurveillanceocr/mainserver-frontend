"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Radar, Sun } from "lucide-react";

import { auth } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type UserWithRole = {
  role?: "admin" | "operator" | "scanner";
};

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = auth.useSession();
  const { dictionary, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/scanner/login");
      return;
    }
    if (!isPending && session) {
      const role = (session.user as typeof session.user & UserWithRole).role;
      if (role !== "scanner" && role !== "admin") {
        router.push("/portal/dashboard");
      }
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass glow-primary flex items-center justify-center">
            <Radar className="w-6 h-6 text-primary" strokeWidth={1.5} style={{ animation: "pulse 2s infinite" }} />
          </div>
          <p className="text-sm text-muted-foreground">{dictionary.common.loadingSession}</p>
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await auth.signOut();
    router.push("/scanner/login");
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      <header className={cn(
        "h-12 glass-heavy border-b border-border flex items-center justify-between px-4 shrink-0",
      )}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <Radar className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          </div>
          <span className="font-bold tracking-[0.15em] text-sm text-foreground">{dictionary.scannerLogin.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground glass-hover border border-transparent h-8 w-8"
            aria-label={dictionary.common.darkMode}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive glass-hover border border-transparent"
            aria-label={dictionary.common.signOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{dictionary.common.signOut}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
