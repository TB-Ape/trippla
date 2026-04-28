"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Linkify } from "@/components/ui/linkify";
import { AppHeader } from "@/components/AppHeader";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { AppNav } from "@/components/AppNav";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Modal } from "@/components/ui/modal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Select } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { MapPin, Calendar, Users, Wallet, Map, Timer, PartyPopper, Plane, Flag, Check } from "lucide-react";

interface Trip {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
  joinCode: string;
  latestActivityAt: string | null;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    members: number;
    itinerary: number;
    expenses: number;
  };
}

export default function TripsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { toasts, toast, removeToast } = useToast();
  const sidebar = useSidebarState();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadTripIds, setUnreadTripIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale]);

  useEffect(() => {
    if (session) {
      fetchTrips();
    }
  }, [session]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.hasOnboarded === false) setShowOnboarding(true);
      })
      .catch(() => {}); // Non-critical — silently ignore fetch errors
    // Use session.user.id (stable string) not session.user (new object ref each render)
  }, [status, session?.user?.id]);

  async function fetchTrips() {
    try {
      const response = await fetch("/api/trips");
      if (!response.ok) throw new Error("Failed to fetch trips");
      const data = await response.json();

      const sortedTrips = data.trips.sort((a: Trip, b: Trip) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      setTrips(sortedTrips);

      const unread = new Set<string>();
      for (const trip of sortedTrips) {
        if (!trip.latestActivityAt) continue;
        const seen = localStorage.getItem(`seen_trip_${trip.id}`);
        if (!seen || new Date(trip.latestActivityAt) > new Date(seen)) {
          unread.add(trip.id);
        }
      }
      setUnreadTripIds(unread);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function getCountdown(startDate: string | null, endDate: string | null): { text: string; color: string; icon: LucideIcon } | null {
    if (!startDate) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : start;
    end.setHours(0, 0, 0, 0);

    const msPerDay = 86400000;
    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / msPerDay);
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / msPerDay);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1;
    const currentDay = totalDays - daysUntilEnd;

    if (daysUntilStart > 0) {
      return { text: t("trips.countdown.daysLeft", { count: daysUntilStart }), color: daysUntilStart <= 7 ? "text-amber-400" : "text-teal-400", icon: Timer };
    }
    if (daysUntilStart === 0) return { text: t("trips.countdown.startsToday"), color: "text-green-400", icon: PartyPopper };
    if (daysUntilEnd > 0) return { text: t("trips.countdown.daysOngoing", { current: currentDay, total: totalDays }), color: "text-green-400", icon: Plane };
    if (daysUntilEnd === 0) return { text: t("trips.countdown.endsToday"), color: "text-amber-400", icon: Flag };
    return { text: t("trips.countdown.daysAgo", { count: Math.abs(daysUntilEnd) }), color: "text-gray-500", icon: Check };
  }

  function formatDateRange(startDate: string | null, endDate: string | null) {
    if (!startDate) return null;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = start.toLocaleDateString(locale, options);

    if (end && endDate !== startDate) {
      const endStr = end.toLocaleDateString(locale, options);
      return `${startStr} - ${endStr}`;
    }

    return startStr;
  }

  async function handleCreateTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError(t("trips.endBeforeStart"));
      return;
    }

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      destination: destination,
      type: tripType || undefined,
      startDate,
      endDate,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create trip");
      }

      setShowCreateModal(false);
      toast.success(t("trips.created"));
      fetchTrips();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }


  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {showOnboarding && (
        <OnboardingModal onDismiss={() => setShowOnboarding(false)} />
      )}
      <AppHeader onMobileMenuToggle={sidebar.toggle} />

      <AppNav current="trips" mobileOpen={sidebar.isOpen} onMobileClose={sidebar.close} />

      <div className="sm:pl-14">
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
                <Plane className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
                {t("trips.yourTrips").split(" ")[0]}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("trips.yourTrips").split(" ")[1]}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400">
                {trips.length} {trips.length === 1 ? t("trips.trip") : t("trips.trips")}
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} variant="gradient" size="lg">
              {t("trips.createTrip")}
            </Button>
          </div>
        </div>
      </div>
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          {trips.length === 0 ? (
            <div className="bg-white/5 border border-white/10 p-16 text-center">
              <Map className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
              <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("trips.noTripsYet")}</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                {t("trips.noTripsSubtitle")}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <Card className="p-6 hover:border-teal-500 transition-all group cursor-pointer relative">
                    {unreadTripIds.has(trip.id) && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                    )}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-bold group-hover:text-teal-400 transition-colors">
                          {trip.name}
                        </h3>
                        {trip.type && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex-shrink-0">
                            {t(`trips.types.${trip.type}`)}
                          </span>
                        )}
                      </div>
                      {trip.destination && (
                        <p className="text-gray-400 flex items-center gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> {trip.destination}
                        </p>
                      )}
                      {formatDateRange(trip.startDate, trip.endDate) && (
                        <p className="text-teal-400 flex items-center gap-2 text-sm font-semibold">
                          <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDateRange(trip.startDate, trip.endDate)}
                        </p>
                      )}
                      {(() => {
                        const countdown = getCountdown(trip.startDate, trip.endDate);
                        return countdown ? (
                          <p className={`flex items-center gap-2 text-sm font-bold ${countdown.color}`}>
                            <countdown.icon className="w-4 h-4 shrink-0" />
                            {countdown.text}
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {trip.description && (
                      <div className="text-gray-400 mb-4">
                        <Linkify className="line-clamp-2">{trip.description}</Linkify>
                      </div>
                    )}

                    <div className="flex gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> <span className="text-gray-400">{trip._count.members}</span></span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> <span className="text-gray-400">{trip._count.itinerary}</span></span>
                      <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> <span className="text-gray-400">{trip._count.expenses}</span></span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-500">
                        {t("trips.by")} {trip.owner.name || trip.owner.email}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Create Trip Modal */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setError(""); setDestination(""); setTripType(""); }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("trips.createTrip").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("trips.createTrip").split(" ")[1]}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
          <form id="create-trip-form" onSubmit={handleCreateTrip} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name">{t("trips.tripName")} *</Label>
              <Input id="name" name="name" placeholder={t("trips.tripNamePlaceholder")} required />
            </div>

            <div>
              <Label htmlFor="destination">{t("trips.destination")}</Label>
              <LocationAutocomplete
                id="destination"
                name="destination"
                value={destination}
                onChange={setDestination}
                placeholder={t("trips.searchDestination")}
              />
            </div>

            <div>
              <Label htmlFor="description">{t("trips.description")}</Label>
              <Input id="description" name="description" placeholder={t("trips.descriptionPlaceholder")} />
            </div>

            <div>
              <Label htmlFor="tripType">{t("trips.tripType")}</Label>
              <Select
                id="tripType"
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
              >
                <option value="">{t("trips.selectType")}</option>
                {["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"].map((type) => (
                  <option key={type} value={type}>
                    {t(`trips.types.${type}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">{t("trips.startDate")}</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div>
                <Label htmlFor="endDate">{t("trips.endDate")}</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="create-trip-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.creating") : t("common.create")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); setError(""); setDestination(""); setTripType(""); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  );
}
