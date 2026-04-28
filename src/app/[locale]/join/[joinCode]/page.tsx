"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LocaleLink as Link } from "@/components/LocaleLink";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const joinCode = params.joinCode as string;

  const [state, setState] = useState<"joining" | "success" | "error">("joining");
  const [errorMessage, setErrorMessage] = useState("");
  const [tripName, setTripName] = useState("");
  const [tripId, setTripId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      // Store the join link so we can redirect back after login
      sessionStorage.setItem("pendingJoinCode", joinCode);
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale, joinCode]);

  useEffect(() => {
    if (session && joinCode) {
      handleJoin();
    }
  }, [session, joinCode]);

  async function handleJoin() {
    try {
      const response = await fetch("/api/trips/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join trip");
      }

      setTripName(data.trip.name);
      setTripId(data.trip.id);
      setState("success");

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/trips/${data.trip.id}`);
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
      setState("error");
    }
  }

  if (status === "loading" || state === "joining") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45 mx-auto mb-8 animate-pulse" />
          <h1 className="text-3xl font-black mb-4 tracking-tight">
            {t("join.joining")}
          </h1>
          <p className="text-gray-400">{t("join.pleaseWait")}</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-6">✈️</div>
          <h1 className="text-3xl font-black mb-4 tracking-tight">
            {t("join.success")}
          </h1>
          <p className="text-gray-400 mb-6">
            {t("join.joinedTrip", { tripName })}
          </p>
          <p className="text-sm text-gray-500">{t("join.redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">😕</div>
        <h1 className="text-3xl font-black mb-4 tracking-tight">
          {t("join.failed")}
        </h1>
        <p className="text-gray-400 mb-8">{errorMessage}</p>
        <Link
          href="/trips"
          className="px-6 py-3 bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500 text-black font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
        >
          {t("join.goToTrips")}
        </Link>
      </div>
    </div>
  );
}
