"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getCurrentUser, updateName, updateEmail, updatePassword, updatePhone } from "@/lib/auth";
import type { User as AppwriteUser } from "@/lib/auth";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const inputCls =
  "rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [original, setOriginal] = useState<AppwriteUser | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) return;
      setOriginal(u);
      setName(u.name || "");
      setPhone(u.phone || "");
      setEmail(u.email || "");
    });
  }, []);

  const nameChanged = original && name.trim() !== (original.name || "");
  const phoneChanged = original && phone.trim() !== (original.phone || "");
  const emailChanged = original && email.trim() !== (original.email || "");
  const passwordChanged = newPassword.length > 0;

  // Current password is required when email, phone, or new password changes
  const needsCurrentPassword = emailChanged || phoneChanged || passwordChanged;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (passwordChanged) {
      if (newPassword !== confirmPassword) { setError(t.profilePasswordMismatch); return; }
      if (newPassword.length < 8) { setError(t.profilePasswordShort); return; }
    }

    if (needsCurrentPassword && !currentPassword) {
      setError(t.profileCurrentPassword);
      return;
    }

    setSaving(true);
    try {
      if (nameChanged) await updateName(name.trim());
      if (phoneChanged) await updatePhone(phone.trim(), currentPassword);
      if (emailChanged) await updateEmail(email.trim(), currentPassword);
      if (passwordChanged) await updatePassword(newPassword, currentPassword);

      // Refresh original so dirty-check resets
      const updated = await getCurrentUser();
      if (updated) {
        setOriginal(updated);
        setName(updated.name || "");
        setPhone(updated.phone || "");
        setEmail(updated.email || "");
      }
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t.profileUpdateFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!original) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">{t.profileTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.profileDesc}</p>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-5">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.profileName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.placeholderName}
              className={inputCls}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.profilePhone}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className={inputCls}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.profileEmail}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div className="border-t border-border pt-1" />

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.profileNewPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`${t.profileNewPassword} (${t.profileOptional})`}
              className={inputCls}
            />
          </div>

          {/* Confirm password — only shown when new password is being set */}
          {passwordChanged && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.profileConfirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
          )}

          {/* Current password — only shown when required */}
          {needsCurrentPassword && (
            <>
              <div className="border-t border-border pt-1" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.profileCurrentPassword}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
                <p className="text-xs text-muted-foreground">{t.profileCurrentPasswordHint}</p>
              </div>
            </>
          )}

          {/* Feedback */}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              {t.profileSaved}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
              saving ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
            )}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t.saveChanges}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
