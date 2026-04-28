"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { AppHeader } from "@/components/AppHeader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NOTIFICATION_TYPES = [
  { key: "itinerary", labelKey: "notifItinerary" },
  { key: "expense", labelKey: "notifExpense" },
  { key: "packing", labelKey: "notifPacking" },
  { key: "transport", labelKey: "notifTransport" },
  { key: "stage", labelKey: "notifStage" },
  { key: "poll", labelKey: "notifPoll" },
] as const;

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const [name, setName] = useState("");
  const [disabledNotifTypes, setDisabledNotifTypes] = useState<string[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale]);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/notification-preferences")
      .then((r) => r.json())
      .then((data) => setDisabledNotifTypes(data.disabledTypes ?? []));
  }, [session?.user]);

  async function handleNotifToggle(entityType: string) {
    const isCurrentlyDisabled = disabledNotifTypes.includes(entityType);
    // Optimistic update
    if (isCurrentlyDisabled) {
      setDisabledNotifTypes((prev) => prev.filter((t) => t !== entityType));
    } else {
      setDisabledNotifTypes((prev) => [...prev, entityType]);
    }
    // Sync to server: if currently disabled → enable (DELETE row), if enabled → disable (POST row)
    await fetch("/api/user/notification-preferences", {
      method: isCurrentlyDisabled ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType }),
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setAvatarPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await update();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
      setAvatarPreview(null);
    }
  }

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNameSuccess(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await update({ name });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDataExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trippla-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = `/${locale}`;
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
      setIsDeleting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader />
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
              {t("settings.title")}
            </span>
          </h1>
        </div>
      </div>
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-2xl mx-auto">

          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-400 mb-8">
              <p className="font-bold text-sm uppercase tracking-wider">{error}</p>
            </div>
          )}

          {/* Avatar */}
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.profilePicture")}</h2>
            <div className="flex items-center gap-6">
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <UserAvatar
                    name={session.user.name || null}
                    email={session.user.email}
                    image={session.user.image}
                    size="lg"
                  />
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <span className="px-4 py-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500 text-black font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-opacity">
                    {t("settings.uploadPhoto")}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPEG, PNG, WebP, GIF. Max 5MB.</p>
              </div>
            </div>
          </Card>

          {/* Email (read-only) */}
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("auth.email")}</h2>
            <p className="text-gray-400">{session.user.email}</p>
          </Card>

          {/* Name */}
          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.displayName")}</h2>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-4">
                <Button type="submit" variant="gradient" disabled={isLoading}>
                  {t("common.save")}
                </Button>
                {nameSuccess && (
                  <span className="text-emerald-400 text-sm font-bold">{t("settings.saved")}</span>
                )}
              </div>
            </form>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.changePassword")}</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">{t("auth.passwordMinLength")}</p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <div className="flex items-center gap-4">
                <Button type="submit" variant="gradient" disabled={isLoading}>
                  {t("settings.updatePassword")}
                </Button>
                {passwordSuccess && (
                  <span className="text-emerald-400 text-sm font-bold">{t("settings.passwordUpdated")}</span>
                )}
              </div>
            </form>
          </Card>

          {/* Language */}
          <Card className="p-6 mt-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.language")}</h2>
            <LanguageSwitcher />
          </Card>

          {/* Notifications */}
          <Card className="p-6 mt-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.notifications")}</h2>
            <p className="text-sm text-gray-400 mb-4">{t("settings.notificationsSubtitle")}</p>
            <div className="space-y-3">
              {NOTIFICATION_TYPES.map(({ key, labelKey }) => {
                const isEnabled = !disabledNotifTypes.includes(key);
                const label = t(`settings.${labelKey}`);
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm font-bold uppercase tracking-wider text-gray-300">{label}</span>
                    <button
                      type="button"
                      onClick={() => handleNotifToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isEnabled
                          ? "bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500"
                          : "bg-white/10"
                      }`}
                      aria-pressed={isEnabled}
                      aria-label={t(isEnabled ? "settings.notifDisable" : "settings.notifEnable", { label })}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Data Export */}
          <Card className="p-6 mt-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.dataExport")}</h2>
            <p className="text-sm text-gray-400 mb-4">{t("settings.dataExportDesc")}</p>
            <Button
              type="button"
              onClick={handleDataExport}
              disabled={isExporting}
              variant="outline"
            >
              {isExporting ? t("settings.downloadingData") : t("settings.downloadMyData")}
            </Button>
          </Card>

          {/* Delete Account */}
          <Card className="p-6 mt-6 border-red-500/30">
            <h2 className="text-2xl font-black tracking-tight mb-4 text-red-400">{t("settings.deleteAccount")}</h2>
            <p className="text-sm text-gray-400 mb-4">{t("settings.deleteAccountWarning")}</p>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {deleteError}
                </div>
              )}
              <Input
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={t("settings.deleteAccountConfirmPlaceholder")}
                required
                disabled={isDeleting}
                className="border-red-500/30"
              />
              <Button
                type="submit"
                disabled={isDeleting || deleteEmail.toLowerCase() !== session.user.email?.toLowerCase()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-xs px-4 py-2 disabled:opacity-50"
              >
                {isDeleting ? t("settings.deleteAccountDeleting") : t("settings.deleteAccountButton")}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
