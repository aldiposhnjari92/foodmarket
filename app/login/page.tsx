"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket, Loader2 } from "lucide-react";
import { login, register } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="size-7 text-primary" />
            <span className="text-2xl font-bold">{t.appName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? t.signInToAccount : t.createNewAccount}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.labelName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.placeholderName}
                required
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.labelEmail}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.labelPassword}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
              loading ? "bg-primary/60 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === "login" ? t.signingIn : t.creatingAccount}
              </>
            ) : mode === "login" ? (
              t.signIn
            ) : (
              t.createAccount
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? t.noAccount : t.alreadyAccount}{" "}
          <button
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "login" ? t.signUp : t.signIn}
          </button>
        </p>
      </div>
    </div>
  );
}
