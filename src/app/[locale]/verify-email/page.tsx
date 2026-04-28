"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else if (email) {
      // Just showing the "check your email" message
      setStatus("success");
      setMessage(t("email.checkEmailMessage"));
    } else {
      setStatus("error");
      setMessage("Invalid verification link.");
    }
  }, [token, email]);

  async function verifyEmail(token: string) {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  async function handleResendEmail() {
    if (!email) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(t("email.checkEmailMessage"));
      } else {
        setMessage(data.error || "Failed to resend email.");
      }
    } catch (error) {
      setMessage("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1a1a1a] border-2 border-white/20 p-8">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rotate-45 group-hover:rotate-90 transition-transform" />
            <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>

          {status === "loading" ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-xl font-bold">{t("email.verifyingEmail")}</p>
            </div>
          ) : status === "success" ? (
            <div className="text-center">
              <div className="text-6xl mb-6">✅</div>
              <h1 className="text-4xl font-black mb-4 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {token ? t("email.verified") : t("email.checkYourEmail")}
                </span>
              </h1>
              <p className="text-gray-400 mb-8">{message}</p>

              {token ? (
                <Link href="/login">
                  <Button variant="gradient" size="lg" className="w-full">
                    {t("email.goToLogin")}
                  </Button>
                </Link>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    {t("email.didntReceive")}
                  </p>
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled={isResending}
                  >
                    {isResending ? t("email.sending") : t("email.resendEmail")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-6">❌</div>
              <h1 className="text-4xl font-black mb-4 tracking-tight text-red-400">
                {t("email.verificationFailed")}
              </h1>
              <p className="text-gray-400 mb-8">{message}</p>

              <div className="space-y-4">
                {email && (
                  <Button
                    onClick={handleResendEmail}
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    disabled={isResending}
                  >
                    {isResending ? t("email.sending") : t("email.resendEmail")}
                  </Button>
                )}
                <Link href="/signup">
                  <Button variant="outline" size="lg" className="w-full">
                    {t("email.backToSignup")}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
