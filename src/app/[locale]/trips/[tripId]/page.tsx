"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { UserAvatar } from "@/components/UserAvatar";
import { AppHeader } from "@/components/AppHeader";
import { Linkify } from "@/components/ui/linkify";
import { TripNav } from "@/components/TripNav";
import { PageTransition } from "@/components/PageTransition";
import { WeatherBadge } from "@/components/ui/weather-badge";
import type { WeatherDay } from "@/lib/weather";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import {
  MapPin, Calendar, Wallet, Vote, Plane, Timer, PartyPopper, Flag, Check,
  UtensilsCrossed, Hotel, Target, TrainFront,
  ClipboardList, Bike, Footprints, Clock, Home,
} from "lucide-react";

interface TripMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Trip {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  joinCode: string;
  isTemplate: boolean;
  templateDescription: string | null;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  members: TripMember[];
}

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ItineraryItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  category: string;
  location: string | null;
  isAllDay: boolean;
}

interface Transport {
  id: string;
  title: string;
  mode: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
}

interface Stage {
  id: string;
  order: number;
  title: string;
  date: string | null;
  description: string | null;
  startLocation: string | null;
  endLocation: string | null;
  distance: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  duration: number | null;
  difficulty: string | null;
  accommodation: string | null;
}

interface DayEvent {
  type: "itinerary" | "transport" | "stage";
  data: ItineraryItem | Transport | Stage;
}

const ITINERARY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  meal: UtensilsCrossed,
  travel: Plane,
  accommodation: Hotel,
  activity: Target,
};

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  itinerary: Calendar,
  expense: Wallet,
  poll: Vote,
  trip: Plane,
};

function getActivityIcon(type: string): LucideIcon {
  return ACTIVITY_ICONS[type] ?? Calendar;
}

const ENTITY_TO_SECTION: Record<string, string> = {
  itinerary: "itinerary",
  expense: "expenses",
  packing: "packing",
  poll: "polls",
  transport: "transport",
  stage: "stages",
  accommodation: "accommodations",
};

export default function TripDetailPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const tripId = params.tripId as string;
  const sidebar = useSidebarState();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editType, setEditType] = useState("");
  const [editCurrency, setEditCurrency] = useState("EUR");
  const [showMenu, setShowMenu] = useState(false);
  const [schedule, setSchedule] = useState<Map<string, DayEvent[]>>(new Map());
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [weather, setWeather] = useState<Record<string, WeatherDay>>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [unseenActivityIds, setUnseenActivityIds] = useState<Set<string>>(new Set());
  const [unseenSections, setUnseenSections] = useState<Set<string>>(new Set());
  const [visibleActivityCount, setVisibleActivityCount] = useState(3);
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    if (session && tripId) {
      fetchTrip();
      fetchActivities();
      fetchSchedule();
      localStorage.setItem(`seen_trip_${tripId}`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchTrip() {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push(`/${locale}/trips`);
          return;
        }
        throw new Error("Failed to fetch trip");
      }
      const data = await response.json();
      setTrip(data.trip);
      setIsMuted(data.isMuted ?? false);
    } catch (error) {
      console.error("Error fetching trip:", error);
      router.push(`/${locale}/trips`);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch(`/api/trips/${tripId}/activities?limit=12`);
      if (response.ok) {
        const data = await response.json();
        const fetchedActivities: Activity[] = data.activities;
        setActivities(fetchedActivities);
        computeUnseen(fetchedActivities);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }

  function computeUnseen(fetchedActivities: Activity[]) {
    const currentUserId = session?.user?.id;
    const unseenIds = new Set<string>();

    for (const activity of fetchedActivities) {
      if (activity.user.id === currentUserId) continue;
      const stored = localStorage.getItem(`seen_${tripId}_${activity.entityType}`);
      if (!stored || new Date(activity.createdAt) > new Date(stored)) {
        unseenIds.add(activity.id);
      }
    }

    setUnseenActivityIds(unseenIds);

    const sections = new Set<string>();
    for (const activity of fetchedActivities) {
      if (unseenIds.has(activity.id)) {
        const section = ENTITY_TO_SECTION[activity.entityType];
        if (section) sections.add(section);
      }
    }
    setUnseenSections(sections);
  }

  async function fetchSchedule() {
    try {
      const [itineraryRes, transportRes, stagesRes, weatherRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/itinerary`),
        fetch(`/api/trips/${tripId}/transport`),
        fetch(`/api/trips/${tripId}/stages`),
        fetch(`/api/trips/${tripId}/weather`),
      ]);

      const eventsByDate = new Map<string, DayEvent[]>();

      if (itineraryRes.ok) {
        const { items } = await itineraryRes.json();
        (items as ItineraryItem[]).forEach((item) => {
          const date = new Date(item.startTime).toISOString().split("T")[0];
          if (!eventsByDate.has(date)) eventsByDate.set(date, []);
          eventsByDate.get(date)!.push({ type: "itinerary", data: item });
        });
      }

      if (transportRes.ok) {
        const { transports } = await transportRes.json();
        (transports as Transport[]).forEach((transport) => {
          const date = new Date(transport.departureTime).toISOString().split("T")[0];
          if (!eventsByDate.has(date)) eventsByDate.set(date, []);
          eventsByDate.get(date)!.push({ type: "transport", data: transport });
        });
      }

      // Map stages by their date field
      if (stagesRes.ok) {
        const { stages } = await stagesRes.json();
        if (stages && stages.length > 0) {
          (stages as Stage[]).forEach((stage) => {
            if (!stage.date) return;
            const dateKey = new Date(stage.date).toISOString().split("T")[0];
            if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, []);
            eventsByDate.get(dateKey)!.push({ type: "stage", data: stage });
          });
        }
      }

      setSchedule(eventsByDate);

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        setWeather(weatherData.weather || {});
      }

      const allDates = new Set(eventsByDate.keys());
      const sorted = Array.from(allDates).sort();
      setScheduleDates(sorted);

      const today = new Date().toISOString().split("T")[0];
      if (allDates.has(today)) {
        setExpandedDays(new Set([today]));
      } else if (sorted.length > 0) {
        const upcoming = sorted.find((d) => d >= today);
        if (upcoming) setExpandedDays(new Set([upcoming]));
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }
  }

  function getJoinLink() {
    if (!trip) return "";
    return `${window.location.origin}/${locale}/join/${trip.joinCode}`;
  }

  function copyJoinLink() {
    if (!trip) return;
    const link = getJoinLink();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function handleEditTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError("");

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get("startDate") as string || null;
    const endDate = formData.get("endDate") as string || null;

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setEditError(t("trips.endBeforeStart"));
      return;
    }

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      destination: editDestination,
      type: editType || null,
      startDate,
      endDate,
      currency: editCurrency,
    };

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setShowEditModal(false);
      fetchTrip();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDeleteTrip() {
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/${locale}/trips`);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleExportPDF() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/export`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${trip?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;
    setIsSavingTemplate(true);
    try {
      const isEnabling = !trip.isTemplate;
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTemplate: isEnabling,
          templateDescription: isEnabling ? templateDescription : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setShowTemplateModal(false);
      fetchTrip();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleMuteToggle() {
    const newMuted = !isMuted;
    setIsMuted(newMuted); // optimistic
    await fetch(`/api/trips/${tripId}/mute`, {
      method: newMuted ? "POST" : "DELETE",
    });
  }

  function getCountdown(startDate: string | null, endDate: string | null) {
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

  function formatDate(dateString: string | null) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("activity.justNow");
    if (diffMins < 60) return t("activity.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("activity.hoursAgo", { count: diffHours });
    return t("activity.daysAgo", { count: diffDays });
  }

  function getActivityLink(entityType: string): string | null {
    switch (entityType) {
      case "itinerary": return `/trips/${tripId}/itinerary`;
      case "expense": return `/trips/${tripId}/expenses`;
      case "packing": return `/trips/${tripId}/packing`;
      case "poll": return `/trips/${tripId}/polls`;
      case "transport": return `/trips/${tripId}/transport`;
      case "stage": return `/trips/${tripId}/stages`;
      default: return null;
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session || !trip) {
    return null;
  }

  const isOwner = trip.owner.id === session.user.id;
  const currentMember = trip.members.find((m) => m.user.id === session.user.id);
  const canManageRoles = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  async function handleRoleChange(memberId: string, newRole: "ADMIN" | "MEMBER") {
    try {
      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("tripDetail.roleChangeFailed"));
      }
      fetchTrip();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("tripDetail.roleChangeFailed"));
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader backHref="/trips" onMobileMenuToggle={sidebar.toggle} />

      <TripNav tripId={tripId} currentSection="overview" unseenSections={unseenSections} mobileOpen={sidebar.isOpen} onMobileClose={sidebar.close} />

      <PageTransition section="overview" tripId={tripId} className="sm:pl-14">
      {/* Trip Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto relative">
          {isOwner && (
            <div className="absolute top-0 right-0" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-white/10 transition-colors rounded"
                aria-label="Menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
                  <circle cx="10" cy="4" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="16" r="1.5" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-50 min-w-[160px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setEditDestination(trip.destination || "");
                      setEditType(trip.type || "");
                      setEditCurrency(trip.currency || "EUR");
                      setShowEditModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setTemplateDescription(trip.templateDescription || "");
                      setShowTemplateModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
                  >
                    {trip.isTemplate ? t("templates.unshareTemplate") : t("templates.shareAsTemplate")}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleExportPDF();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors"
                  >
                    {t("common.exportPDF")}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pr-10">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                {trip.name}
              </h1>
              {trip.isTemplate && (
                <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 mb-3">
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" /> {t("templates.templateBadge")}
                </span>
              )}
              {trip.destination && (
                <p className="text-xl md:text-2xl text-gray-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {trip.destination}
                </p>
              )}
              {(trip.startDate || trip.endDate) && (
                <p className="text-lg md:text-xl text-gray-500">
                  {formatDate(trip.startDate)}
                  {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                </p>
              )}
              {(() => {
                const countdown = getCountdown(trip.startDate, trip.endDate);
                return countdown ? (
                  <p className={`text-lg md:text-xl font-bold mt-2 flex items-center gap-2 ${countdown.color}`}>
                    <countdown.icon className="w-4 h-4 shrink-0" /> {countdown.text}
                  </p>
                ) : null;
              })()}
            </div>

            <div>
              <Button
                onClick={copyJoinLink}
                variant="gradient"
                size="lg"
              >
                {linkCopied ? t("join.linkCopied") : t("join.copyLink")}
              </Button>
            </div>
          </div>

          {trip.description && (
            <Card className="mt-6 p-6">
              <div className="text-lg text-gray-300"><Linkify>{trip.description}</Linkify></div>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Schedule */}
          {scheduleDates.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-black mb-4 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("tripDetail.schedule")}
                </span>
              </h2>
              <div className="space-y-2">
                {scheduleDates.map((dateKey) => {
                  const dayEvents = schedule.get(dateKey) || [];
                  const isExpanded = expandedDays.has(dateKey);
                  const today = new Date().toISOString().split("T")[0];
                  const isToday = dateKey === today;

                  // Calculate day number relative to trip start
                  let dayNumber: number | null = null;
                  if (trip.startDate) {
                    const start = new Date(trip.startDate);
                    start.setHours(0, 0, 0, 0);
                    const current = new Date(dateKey);
                    current.setHours(0, 0, 0, 0);
                    const diff = Math.round((current.getTime() - start.getTime()) / 86400000);
                    if (diff >= 0) dayNumber = diff + 1;
                  }

                  const dateFormatted = new Date(dateKey + "T00:00:00").toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });

                  const dayHasNew = dayEvents.some((event) =>
                    activities.some((a) => a.entityId === event.data.id && unseenActivityIds.has(a.id))
                  );

                  return (
                    <Card
                      key={dateKey}
                      className={`overflow-hidden ${isToday ? "border-teal-500 bg-teal-500/5" : ""}`}
                    >
                      <button
                        onClick={() => {
                          const next = new Set(expandedDays);
                          if (next.has(dateKey)) next.delete(dateKey);
                          else next.add(dateKey);
                          setExpandedDays(next);
                        }}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {dayNumber != null && (
                            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider min-w-[3rem]">
                              {t("tripDetail.dayLabel", { number: dayNumber })}
                            </span>
                          )}
                          <span className={`font-bold ${isToday ? "text-teal-400" : "text-white"}`}>
                            {dateFormatted}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500 text-white rounded">
                              Today
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {t("tripDetail.eventsCount", { count: dayEvents.length })}
                          </span>
                          {dayHasNew && !isExpanded && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                          )}
                        </div>
                        {weather[dateKey] && (
                          <WeatherBadge
                            temperatureMax={weather[dateKey].temperatureMax}
                            temperatureMin={weather[dateKey].temperatureMin}
                            weatherCode={weather[dateKey].weatherCode}
                            variant="expanded"
                          />
                        )}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/10 px-4 py-3 space-y-2">
                          {dayEvents.length === 0 ? (
                            <p className="text-sm text-gray-500">{t("tripDetail.noPlansYet")}</p>
                          ) : (
                            dayEvents
                              .sort((a, b) => {
                                if (a.type === "stage" && b.type === "stage") return (a.data as Stage).order - (b.data as Stage).order;
                                if (a.type === "stage") return -1;
                                if (b.type === "stage") return -1;
                                const timeA = a.type === "itinerary"
                                  ? (a.data as ItineraryItem).startTime
                                  : (a.data as Transport).departureTime;
                                const timeB = b.type === "itinerary"
                                  ? (b.data as ItineraryItem).startTime
                                  : (b.data as Transport).departureTime;
                                return new Date(timeA).getTime() - new Date(timeB).getTime();
                              })
                              .map((event) => {
                                const eventKey = `${event.type}-${event.data.id}`;
                                const isEventExpanded = expandedEvents.has(eventKey);
                                const isNewScheduleItem = activities.some(
                                  (a) => a.entityId === event.data.id && unseenActivityIds.has(a.id)
                                );
                                const toggleEvent = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  const next = new Set(expandedEvents);
                                  if (next.has(eventKey)) next.delete(eventKey);
                                  else next.add(eventKey);
                                  setExpandedEvents(next);
                                };

                                if (event.type === "stage") {
                                  const stage = event.data as Stage;
                                  const modeDot: Record<string, string> = { easy: "bg-green-500", moderate: "bg-yellow-500", hard: "bg-orange-500", expert: "bg-red-500" };
                                  return (
                                    <div key={`s-${stage.id}`} className="bg-emerald-500/10 border border-emerald-500/30 rounded text-sm overflow-hidden">
                                      <button onClick={toggleEvent} className="w-full flex items-center gap-3 p-2 text-left hover:bg-emerald-500/10 transition-colors">
                                        {trip?.type === "cycling" ? <Bike className="w-4 h-4 shrink-0" /> : <Footprints className="w-4 h-4 shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                          <span className="flex items-center gap-2">
                                            <Link href={`/trips/${tripId}/stages`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="font-semibold hover:text-teal-400 transition-colors">
                                              {stage.title}
                                            </Link>
                                            {isNewScheduleItem && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 animate-pulse" />
                                            )}
                                          </span>
                                          {stage.startLocation && stage.endLocation && (
                                            <span className="text-gray-500 ml-2 text-xs">
                                              <a href={`https://www.google.com/maps/dir/${encodeURIComponent(stage.startLocation)}/${encodeURIComponent(stage.endLocation)}`} target="_blank" rel="noopener noreferrer" onClick={(e: React.MouseEvent) => e.stopPropagation()} className="hover:text-teal-400 transition-colors flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {stage.startLocation} → {stage.endLocation}</a>
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {stage.distance && <span className="text-xs text-gray-400">{stage.distance} km</span>}
                                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={`text-gray-500 transition-transform ${isEventExpanded ? "rotate-180" : ""}`}>
                                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </div>
                                      </button>
                                      {isEventExpanded && (
                                        <div className="border-t border-emerald-500/20 px-3 py-2 space-y-1 text-xs text-gray-400">
                                          {stage.difficulty && <p className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full inline-block shrink-0 ${modeDot[stage.difficulty] ?? "bg-gray-400"}`} /> {t("stages.difficulty")}: {t(`stages.difficulties.${stage.difficulty}`)}</p>}
                                          {stage.elevationGain != null && <p>↗ {stage.elevationGain}m {stage.elevationLoss != null && <>↘ {stage.elevationLoss}m</>}</p>}
                                          {stage.duration != null && <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 shrink-0" /> {stage.duration}h</p>}
                                          {stage.accommodation && <p className="flex items-center gap-1"><Home className="w-3.5 h-3.5 shrink-0" /> {t(`stages.accommodations.${stage.accommodation}`)}</p>}
                                          {stage.description && <Linkify className="text-gray-500 mt-1">{stage.description}</Linkify>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (event.type === "transport") {
                                  const t2 = event.data as Transport;
                                  return (
                                    <div key={`t-${t2.id}`} className="bg-blue-500/10 border border-blue-500/30 rounded text-sm overflow-hidden">
                                      <button onClick={toggleEvent} className="w-full flex items-center gap-3 p-2 text-left hover:bg-blue-500/10 transition-colors">
                                        <TrainFront className="w-4 h-4 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <span className="flex items-center gap-2">
                                            <Link href={`/trips/${tripId}/transport`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="font-semibold hover:text-teal-400 transition-colors">
                                              {t2.departureLocation} → {t2.arrivalLocation}
                                            </Link>
                                            {isNewScheduleItem && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 animate-pulse" />
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-xs text-gray-400">
                                            {new Date(t2.departureTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                                          </span>
                                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={`text-gray-500 transition-transform ${isEventExpanded ? "rotate-180" : ""}`}>
                                            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </div>
                                      </button>
                                      {isEventExpanded && (
                                        <div className="border-t border-blue-500/20 px-3 py-2 space-y-1 text-xs text-gray-400">
                                          {t2.title && <p className="font-medium text-white">{t2.title}</p>}
                                          <p>
                                            <a href={`https://www.google.com/maps/place/${encodeURIComponent(t2.departureLocation)}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {t2.departureLocation}</a>
                                            {" → "}
                                            <a href={`https://www.google.com/maps/place/${encodeURIComponent(t2.arrivalLocation)}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {t2.arrivalLocation}</a>
                                          </p>
                                          <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 shrink-0" /> {new Date(t2.departureTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} → {new Date(t2.arrivalTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}</p>
                                          <p className="text-gray-500 capitalize">{t2.mode}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const item = event.data as ItineraryItem;
                                const CategoryIcon = ITINERARY_CATEGORY_ICONS[item.category] ?? Calendar;
                                return (
                                  <div key={`i-${item.id}`} className="bg-white/5 border border-white/10 rounded text-sm overflow-hidden">
                                    <button onClick={toggleEvent} className="w-full flex items-center gap-3 p-2 text-left hover:bg-white/5 transition-colors">
                                      <CategoryIcon className="w-4 h-4 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <span className="flex items-center gap-2">
                                          <Link href={`/trips/${tripId}/${item.category === "accommodation" ? "accommodations" : "itinerary"}`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="font-semibold hover:text-teal-400 transition-colors">
                                            {item.title}
                                          </Link>
                                          {isNewScheduleItem && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 animate-pulse" />
                                          )}
                                        </span>
                                        {item.location && (
                                          <a href={`https://www.google.com/maps/place/${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer" onClick={(e: React.MouseEvent) => e.stopPropagation()} className="text-gray-500 ml-2 text-xs hover:text-teal-400 transition-colors flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}
                                          </a>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-gray-400">
                                          {item.isAllDay ? t("common.allDay") : new Date(item.startTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={`text-gray-500 transition-transform ${isEventExpanded ? "rotate-180" : ""}`}>
                                          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      </div>
                                    </button>
                                    {isEventExpanded && (
                                      <div className="border-t border-white/10 px-3 py-2 space-y-1 text-xs text-gray-400">
                                        {item.location && (
                                          <p>
                                            <a href={`https://www.google.com/maps/place/${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}</a>
                                          </p>
                                        )}
                                        {!item.isAllDay && (
                                          <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 shrink-0" /> {new Date(item.startTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                                            {item.endTime && <> → {new Date(item.endTime).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}</>}
                                          </p>
                                        )}
                                        <p className="text-gray-500 capitalize">{item.category}</p>
                                        {item.description && <Linkify className="text-gray-500 mt-1">{item.description}</Linkify>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Activity Feed */}
            <div className="md:col-span-2">
              <h2 className="text-2xl md:text-3xl font-black mb-6 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("activity.title")}
                </span>
              </h2>

              {activities.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500 text-lg">{t("activity.noActivity")}</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activities.slice(0, visibleActivityCount).map((activity) => {
                    const link = getActivityLink(activity.entityType);
                    const isUnseen = unseenActivityIds.has(activity.id);
                    const content = (
                      <Card className={`p-4 flex items-center gap-4${link ? " hover:border-teal-500 transition-all cursor-pointer" : ""}${isUnseen ? " border-teal-500/40 bg-teal-500/5" : ""}`}>
                        <div className="relative flex-shrink-0">
                          <UserAvatar name={activity.user.name} email={activity.user.email} image={activity.user.image} size="md" />
                          {isUnseen && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-teal-400 border border-[#0a0a0a]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-bold">
                              {activity.user.name || activity.user.email}
                            </span>
                            {" "}
                            <span className="text-gray-400">
                              {t(`activity.${activity.action}`)}
                            </span>
                            {" "}
                            <span className="text-gray-400">
                              {t(`activity.${activity.entityType}`)}
                            </span>
                            {activity.entityName && (
                              <>
                                {": "}
                                <span className="text-white font-medium">
                                  {activity.entityName}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(() => { const ActivityIcon = getActivityIcon(activity.entityType); return <ActivityIcon className="w-4 h-4 shrink-0" />; })()}
                          {isUnseen && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-teal-500 text-white rounded uppercase tracking-wider">
                              New
                            </span>
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {timeAgo(activity.createdAt)}
                          </span>
                        </div>
                      </Card>
                    );

                    return link ? (
                      <Link key={activity.id} href={link}>
                        {content}
                      </Link>
                    ) : (
                      <div key={activity.id}>{content}</div>
                    );
                  })}
                  {visibleActivityCount < activities.length && (
                    <button
                      onClick={() => setVisibleActivityCount((c) => c + 3)}
                      className="w-full py-2 text-xs text-gray-500 hover:text-teal-400 transition-colors uppercase tracking-wider"
                    >
                      Show more ({activities.length - visibleActivityCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div>
              <h2 className="text-3xl font-black mb-6 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("tripDetail.overview").toUpperCase()}
                </span>
              </h2>

              <div className="space-y-4">
                <Card className="p-4">
                  <p className="text-sm text-gray-500 mb-1">Trip Owner</p>
                  <p className="font-bold">{trip.owner.name || trip.owner.email}</p>
                </Card>

                <Card className="p-4">
                  <p className="text-sm text-gray-500 mb-1">{t("tripDetail.members")}</p>
                  <p className="text-3xl font-black">{trip.members.length}</p>
                </Card>

              </div>
            </div>
          </div>

          {/* Members */}
          <div className="mt-12">
            <h2 className="text-2xl md:text-3xl font-black mb-6 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                {t("tripDetail.members").toUpperCase()}
              </span>
              <span className="text-gray-500 text-xl ml-3">
                ({trip.members.length})
              </span>
            </h2>

            <div className="space-y-3">
              {trip.members.map((member) => (
                <Card key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <UserAvatar name={member.user.name} email={member.user.email} image={member.user.image} size="lg" />
                    <div className="min-w-0">
                      <p className="font-bold truncate">
                        {member.user.name || member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        member.role === "OWNER"
                          ? "bg-teal-500/20 text-teal-400 border border-teal-500/50"
                          : member.role === "ADMIN"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                          : "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                      }`}
                    >
                      {t(`tripDetail.role${member.role.charAt(0) + member.role.slice(1).toLowerCase()}`)}
                    </span>
                    {canManageRoles && member.role !== "OWNER" && member.user.id !== session.user.id && (
                      <button
                        onClick={() => handleRoleChange(member.id, member.role === "ADMIN" ? "MEMBER" : "ADMIN")}
                        className="px-2 py-1 text-xs border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {member.role === "ADMIN" ? t("tripDetail.demoteToMember") : t("tripDetail.promoteAdmin")}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-4 p-4 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider text-gray-300">
                {t("tripDetail.notifications")}
              </span>
              <button
                onClick={handleMuteToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  !isMuted ? "bg-teal-500" : "bg-gray-600"
                }`}
                role="switch"
                aria-checked={!isMuted}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    !isMuted ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </Card>
          </div>
        </div>
      </main>

      </PageTransition>

      {/* Edit Trip Modal */}
      {trip && <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditError(""); }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("tripDetail.editTrip").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("tripDetail.editTrip").split(" ").slice(1).join(" ")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
          <form id="edit-trip-form" onSubmit={handleEditTrip} className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                {editError}
              </div>
            )}
            <div>
              <Label htmlFor="editName">{t("trips.tripName")} *</Label>
              <Input id="editName" name="name" defaultValue={trip?.name} required />
            </div>
            <div>
              <Label htmlFor="editDestination">{t("trips.destination")}</Label>
              <LocationAutocomplete
                id="editDestination"
                name="destination"
                value={editDestination}
                onChange={setEditDestination}
                placeholder={t("trips.searchDestination")}
              />
            </div>
            <div>
              <Label htmlFor="editDescription">{t("trips.description")}</Label>
              <Input id="editDescription" name="description" defaultValue={trip?.description || ""} />
            </div>
            <div>
              <Label htmlFor="editTripType">{t("trips.tripType")}</Label>
              <Select
                id="editTripType"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
              >
                <option value="">{t("trips.selectType")}</option>
                {["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"].map((type) => (
                  <option key={type} value={type}>{t(`trips.types.${type}`)}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="editCurrency">{t("trips.currency")}</Label>
              <Select
                id="editCurrency"
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value)}
              >
                {["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "JPY", "AUD", "CAD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartDate">{t("trips.startDate")}</Label>
                <Input id="editStartDate" name="startDate" type="date" defaultValue={trip?.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : ""} />
              </div>
              <div>
                <Label htmlFor="editEndDate">{t("trips.endDate")}</Label>
                <Input id="editEndDate" name="endDate" type="date" defaultValue={trip?.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : ""} />
              </div>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="edit-trip-form" variant="gradient" className="flex-1">
            {t("common.saveChanges")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditError(""); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>}

      {/* Share as Template Modal */}
      {trip && <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)}>
        <Modal.Header>
          {trip?.isTemplate ? (
            <>
              <h2 className="text-2xl font-black tracking-tight mb-2">{t("templates.unshareTemplate")}</h2>
              <p className="text-gray-400 text-sm">{t("templates.unshareConfirm")}</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black tracking-tight mb-2">{t("templates.shareAsTemplate")}</h2>
              <p className="text-gray-400 text-sm">{t("templates.shareSubtitle")}</p>
            </>
          )}
        </Modal.Header>
        {trip?.isTemplate ? (
          <Modal.Footer>
            <Button onClick={handleSaveTemplate} variant="outline" className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10" disabled={isSavingTemplate}>
              {t("templates.unshare")}
            </Button>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="flex-1">{t("common.cancel")}</Button>
          </Modal.Footer>
        ) : (
          <>
            <Modal.Body>
              <form id="template-form" onSubmit={handleSaveTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t("templates.templateDescription")}</label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder={t("templates.templateDescriptionPlaceholder")}
                    rows={4}
                    className="w-full bg-black/50 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button type="submit" form="template-form" variant="gradient" disabled={isSavingTemplate} className="flex-1">
                {isSavingTemplate ? t("common.loading") : t("templates.publishTemplate")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowTemplateModal(false)} className="flex-1">{t("common.cancel")}</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>}

      {/* Delete Trip Confirmation */}
      {trip && <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setEditError(""); }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight text-red-400 mb-2">{t("tripDetail.deleteTrip")}</h2>
          <p className="text-gray-400">{t("tripDetail.deleteConfirm", { tripName: trip.name })}</p>
          {editError && (
            <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm mt-4">
              {editError}
            </div>
          )}
        </Modal.Header>
        <Modal.Footer>
          <Button onClick={handleDeleteTrip} variant="outline" className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10">
            {t("common.delete")}
          </Button>
          <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setEditError(""); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>}
    </div>
  );
}
