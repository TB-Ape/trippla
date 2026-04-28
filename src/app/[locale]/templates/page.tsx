"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppNav } from "@/components/AppNav";
import { AppHeader } from "@/components/AppHeader";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import type { LucideIcon } from "lucide-react";
import {
  Building2, Waves, Tent, Footprints, Bike, Car, Mountain, Ship,
  Plane, TrainFront, Bus, Target, UtensilsCrossed, Hotel,
  ClipboardList, Calendar, Rocket, Backpack, MapPin, Package,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  templateDescription: string | null;
  destination: string | null;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
  currency: string;
  templateUseCount: number;
  owner: { id: string; name: string | null; email: string };
  _count: { itinerary: number; stages: number; transports: number };
}

interface TemplateDetail extends Template {
  itinerary: {
    id: string; title: string; description: string | null;
    location: string | null; startTime: string; endTime: string | null;
    category: string | null; isAllDay: boolean;
  }[];
  transports: {
    id: string; order: number; title: string; mode: string;
    departureLocation: string; arrivalLocation: string;
    departureTime: string; arrivalTime: string;
    bookingReference: string | null; notes: string | null; cost: number | null;
  }[];
  stages: {
    id: string; order: number; title: string; date: string | null;
    description: string | null; startLocation: string | null; endLocation: string | null;
    distance: number | null; elevationGain: number | null; elevationLoss: number | null;
    duration: number | null; difficulty: string | null; accommodation: string | null;
  }[];
  packingLists: {
    id: string; name: string; isPrivate: boolean;
    items: { id: string; name: string; quantity: number; category: string | null; isPacked: boolean }[];
  }[];
}

interface PackingTemplate {
  id: string;
  name: string;
  templateDescription: string | null;
  templateUseCount: number;
  shareCode: string;
  tripCategory?: string | null;
  createdBy: { id: string; name: string | null; email: string };
  trip: { type: string | null } | null;
  _count: { items: number };
}

interface PackingTemplateDetail {
  id: string;
  name: string;
  shareCode: string;
  templateDescription: string | null;
  templateUseCount: number;
  createdBy: { id: string; name: string | null; email: string };
  trip: { type: string | null } | null;
  items: {
    id: string; name: string; quantity: number;
    category: string | null; categoryEmoji: string | null;
  }[];
}

interface UserTrip {
  id: string;
  name: string;
}

const TRIP_TYPES = ["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"];

const TYPE_ICONS: Record<string, LucideIcon> = {
  city: Building2,
  beach: Waves,
  camping: Tent,
  hiking: Footprints,
  cycling: Bike,
  roadtrip: Car,
  ski: Mountain,
  cruise: Ship,
};

const TRANSPORT_ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  train: TrainFront,
  bus: Bus,
  car: Car,
  ferry: Ship,
  bike: Bike,
  walk: Footprints,
  taxi: Car,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  activity: Target,
  meal: UtensilsCrossed,
  travel: Plane,
  accommodation: Hotel,
};

function TemplatesPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") === "packing" ? "packing" : "trips";
  const [activeMainTab, setActiveMainTab] = useState<"trips" | "packing">(initialTab);

  // Trip templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Trip modal state
  const [modalStep, setModalStep] = useState<"preview" | "create" | null>(null);
  const [previewData, setPreviewData] = useState<TemplateDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"itinerary" | "transport" | "stages" | "packing">("itinerary");
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Packing templates state
  const [packingTemplates, setPackingTemplates] = useState<PackingTemplate[]>([]);
  const [packingLoading, setPackingLoading] = useState(false);
  const [myPackingLists, setMyPackingLists] = useState<{ id: string; name: string; isTemplate: boolean; items?: { id: string }[] }[]>([]);
  const [myPackingLoading, setMyPackingLoading] = useState(false);
  const [templateStoreTripId, setTemplateStoreTripId] = useState<string | null>(null);
  const [myPackingDeleting, setMyPackingDeleting] = useState<string | null>(null);
  const [packingSearchQ, setPackingSearchQ] = useState("");
  const [packingTypeFilter, setPackingTypeFilter] = useState("");
  const [packingPreview, setPackingPreview] = useState<PackingTemplateDetail | null>(null);
  const [packingPreviewLoading, setPackingPreviewLoading] = useState(false);
  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [userTrips, setUserTrips] = useState<UserTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [addingToTrip, setAddingToTrip] = useState(false);

  // New template dialog
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("");
  const [newTemplateCreating, setNewTemplateCreating] = useState(false);

  const { toasts, toast, removeToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") router.push(`/${locale}/login`);
  }, [status, router, locale]);

  useEffect(() => {
    if (session) {
      fetchTemplates();
      fetchUserTrips();
    }
  }, [session, selectedType]);

  useEffect(() => {
    if (session && activeMainTab === "packing") {
      fetchPackingTemplates();
      fetchMyPackingLists();
    }
  }, [session, activeMainTab, packingTypeFilter]);

  async function fetchTemplates() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.set("type", selectedType);
      if (searchQ) params.set("q", searchQ);
      const res = await fetch(`/api/templates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPackingTemplates() {
    setPackingLoading(true);
    try {
      const params = new URLSearchParams();
      if (packingTypeFilter) params.set("type", packingTypeFilter);
      if (packingSearchQ) params.set("q", packingSearchQ);
      const res = await fetch(`/api/packing-templates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPackingTemplates(data.templates);
    } catch (e) {
      console.error(e);
    } finally {
      setPackingLoading(false);
    }
  }

  async function fetchUserTrips() {
    try {
      const res = await fetch("/api/trips");
      if (!res.ok) return;
      const data = await res.json();
      setUserTrips(data.trips ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchMyPackingLists() {
    if (!session?.user) return;
    setMyPackingLoading(true);
    try {
      const storeRes = await fetch("/api/user/template-store");
      if (!storeRes.ok) return;
      const { tripId } = await storeRes.json();
      setTemplateStoreTripId(tripId);

      const listsRes = await fetch(`/api/trips/${tripId}/packing`);
      if (!listsRes.ok) return;
      const data = await listsRes.json();
      setMyPackingLists(data.lists ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setMyPackingLoading(false);
    }
  }

  function handleNewTemplate() {
    setNewTemplateName(t("templates.newTemplateDefaultName"));
    setNewTemplateCategory("");
    setNewTemplateDialogOpen(true);
  }

  async function handleCreateTemplate() {
    if (!session?.user || !newTemplateName.trim()) return;
    setNewTemplateCreating(true);
    try {
      const storeRes = await fetch("/api/user/template-store");
      if (!storeRes.ok) return;
      const { tripId } = await storeRes.json();

      const body: { name: string; tripCategory?: string } = { name: newTemplateName.trim() };
      if (newTemplateCategory) body.tripCategory = newTemplateCategory;

      const listRes = await fetch(`/api/trips/${tripId}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!listRes.ok) return;
      const { list } = await listRes.json();

      setNewTemplateDialogOpen(false);
      router.push(`/${locale}/templates/packing/${tripId}?list=${list.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setNewTemplateCreating(false);
    }
  }

  async function handleDeleteMyTemplate(listId: string, tripId: string) {
    setMyPackingDeleting(listId);
    try {
      const res = await fetch(`/api/trips/${tripId}/packing?id=${listId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setMyPackingLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (e) {
      console.error(e);
    } finally {
      setMyPackingDeleting(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchTemplates();
  }

  function handlePackingSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPackingTemplates();
  }

  async function openPreview(tpl: Template) {
    setPreviewLoading(true);
    setModalStep("preview");
    setPreviewData(null);
    setNewName(tpl.name);
    setNewStartDate("");
    setCreateError("");
    setActiveTab("itinerary");
    try {
      const res = await fetch(`/api/templates/${tpl.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPreviewData(data.template);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeModal() {
    setModalStep(null);
    setPreviewData(null);
  }

  async function handleUseTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!previewData) return;
    setCreateError("");
    setIsCreating(true);
    try {
      const res = await fetch(`/api/templates/${previewData.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: newStartDate, name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/${locale}/trips/${data.trip.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  async function openPackingPreview(tpl: PackingTemplate) {
    setPackingPreviewLoading(true);
    setPackingModalOpen(true);
    setPackingPreview(null);
    setSelectedTripId("");
    try {
      const res = await fetch(`/api/packing-templates/${tpl.shareCode}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPackingPreview(data.template);
    } catch (e) {
      console.error(e);
    } finally {
      setPackingPreviewLoading(false);
    }
  }

  async function handleAddPackingToTrip() {
    if (!packingPreview || !selectedTripId) return;
    setAddingToTrip(true);
    try {
      const res = await fetch(`/api/packing-templates/${packingPreview.shareCode}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: selectedTripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPackingModalOpen(false);
      toast.success(t("templates.addedToTrip"));
      router.push(`/${locale}/trips/${selectedTripId}/packing`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddingToTrip(false);
    }
  }

  function tripDurationDays(tpl: Template): number | null {
    if (!tpl.startDate || !tpl.endDate) return null;
    const diff = new Date(tpl.endDate).getTime() - new Date(tpl.startDate).getTime();
    return Math.round(diff / 86400000) + 1;
  }

  function dayLabel(dateStr: string, tripStart: string | null): string {
    if (!tripStart) return new Date(dateStr).toLocaleDateString(locale, { month: "short", day: "numeric" });
    const diff = Math.round((new Date(dateStr).getTime() - new Date(tripStart).getTime()) / 86400000);
    return `Day ${diff + 1}`;
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
  }

  // Group packing items by category
  const packingItemsByCategory = packingPreview
    ? packingPreview.items.reduce<Record<string, typeof packingPreview.items>>((acc, item) => {
        const cat = item.category || "other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {})
    : {};

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) return null;

  // Trip modal helpers
  type ItineraryItem = NonNullable<typeof previewData>["itinerary"][number];
  const itineraryByDay: Map<string, ItineraryItem[]> = new Map();
  if (previewData?.itinerary) {
    for (const item of previewData.itinerary) {
      const label = dayLabel(item.startTime, previewData.startDate);
      if (!itineraryByDay.has(label)) itineraryByDay.set(label, []);
      itineraryByDay.get(label)!.push(item);
    }
  }

  const hasTransport = (previewData?.transports?.length ?? 0) > 0;
  const hasStages = (previewData?.stages?.length ?? 0) > 0;
  const hasPacking = (previewData?.packingLists?.length ?? 0) > 0;
  const hasItinerary = (previewData?.itinerary?.length ?? 0) > 0;

  const tabs = [
    hasItinerary && { key: "itinerary" as const, Icon: Calendar, label: t("tripDetail.itinerary") },
    hasTransport && { key: "transport" as const, Icon: Rocket, label: t("tripDetail.transport") },
    hasStages && { key: "stages" as const, Icon: Footprints, label: t("tripDetail.stages") },
    hasPacking && { key: "packing" as const, Icon: Backpack, label: t("tripDetail.packing") },
  ].filter(Boolean) as { key: typeof activeTab; Icon: LucideIcon; label: string }[];

  const ModalTypeIcon: LucideIcon = previewData?.type ? (TYPE_ICONS[previewData.type] ?? Building2) : Building2;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader />
      <AppNav current="templates" />

      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <h1 className="flex items-center gap-3 text-4xl md:text-6xl font-black mb-2 tracking-tighter">
            <ClipboardList className="w-8 h-8 shrink-0" />
            {t("templates.title").split(" ")[0]}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
              {t("templates.title").split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">{t("templates.subtitle")}</p>
          {/* Main Tab Switcher */}
          <div className="flex gap-1 mt-6 border-b border-white/10">
            <button
              onClick={() => setActiveMainTab("trips")}
              className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeMainTab === "trips"
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {t("templates.tripsTab")}
            </button>
            <button
              onClick={() => { setActiveMainTab("packing"); fetchPackingTemplates(); }}
              className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                activeMainTab === "packing"
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Backpack className="w-4 h-4" />
              {t("templates.packingListsTab")}
            </button>
          </div>
        </div>
      </div>
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* ── TRIPS TAB ─────────────────────────────────── */}
          {activeMainTab === "trips" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                  <Input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={t("templates.searchPlaceholder")}
                    className="flex-1"
                  />
                  <Button type="submit" variant="gradient">{t("common.search")}</Button>
                </form>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedType("")}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                      selectedType === "" ? "bg-teal-500 border-teal-500 text-black font-bold" : "border-white/20 hover:bg-white/5"
                    }`}
                  >
                    {t("common.all")}
                  </button>
                  {TRIP_TYPES.map((type) => {
                    const FilterIcon = TYPE_ICONS[type] ?? Building2;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                          selectedType === type ? "bg-teal-500 border-teal-500 text-black font-bold" : "border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <FilterIcon className="w-3.5 h-3.5 shrink-0" />
                        {t(`trips.types.${type}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">{t("common.loading")}</div>
              ) : templates.length === 0 ? (
                <div className="bg-white/5 border border-white/10 p-16 text-center">
                  <ClipboardList className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("templates.noTemplates")}</h2>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">{t("templates.noTemplatesSubtitle")}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((tpl) => {
                    const duration = tripDurationDays(tpl);
                    const TypeIcon = tpl.type ? (TYPE_ICONS[tpl.type] ?? Building2) : Building2;
                    return (
                      <Card key={tpl.id} className="p-6 flex flex-col justify-between hover:border-teal-500 transition-all cursor-pointer" onClick={() => openPreview(tpl)}>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl font-bold">{tpl.name}</h3>
                            {tpl.type && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex-shrink-0 flex items-center gap-1">
                                <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                                {t(`trips.types.${tpl.type}`)}
                              </span>
                            )}
                          </div>
                          {tpl.destination && (
                            <p className="text-gray-400 text-sm mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {tpl.destination}</p>
                          )}
                          {duration && (
                            <p className="text-teal-400 text-sm font-semibold mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" /> {duration} {duration === 1 ? t("templates.day") : t("templates.days")}</p>
                          )}
                          {(tpl.templateDescription || tpl.description) && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                              {tpl.templateDescription || tpl.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-xs text-gray-500 mb-3">
                            {tpl._count.itinerary > 0 && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" /> {tpl._count.itinerary} {t("templates.events")}</span>}
                            {tpl._count.stages > 0 && <span className="flex items-center gap-1"><Footprints className="w-3.5 h-3.5 shrink-0" /> {tpl._count.stages} {t("templates.stages")}</span>}
                            {tpl._count.transports > 0 && <span className="flex items-center gap-1"><Rocket className="w-3.5 h-3.5 shrink-0" /> {tpl._count.transports} {t("templates.transports")}</span>}
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">{t("templates.by")} {tpl.owner.name || tpl.owner.email}</p>
                            {tpl.templateUseCount > 0 && (
                              <p className="text-xs text-teal-500">{tpl.templateUseCount}× {t("templates.used")}</p>
                            )}
                          </div>
                          <Button variant="gradient" size="sm" onClick={(e) => { e.stopPropagation(); openPreview(tpl); }}>
                            {t("templates.preview")}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── PACKING LISTS TAB ─────────────────────────── */}
          {activeMainTab === "packing" && (
            <>
              {/* My Templates */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black uppercase tracking-wider">
                    {t("templates.myPackingTemplates")}
                  </h2>
                  <button
                    onClick={handleNewTemplate}
                    className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500 text-black hover:opacity-90 transition-opacity"
                  >
                    + {t("templates.newTemplate")}
                  </button>
                </div>

                {myPackingLoading ? (
                  <p className="text-gray-500 text-sm">{t("common.loading")}</p>
                ) : myPackingLists.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t("templates.noPersonalTemplates")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myPackingLists.map((list) => (
                      <Card key={list.id} className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm">{list.name}</p>
                            <p className="text-xs text-gray-400">
                              {list.items?.length ?? 0} {t("templates.items")}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 font-bold ${
                            list.isTemplate ? "bg-teal-500/20 text-teal-400" : "bg-white/10 text-gray-400"
                          }`}>
                            {list.isTemplate ? t("templates.public") : t("templates.private")}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => templateStoreTripId && router.push(`/${locale}/templates/packing/${templateStoreTripId}?list=${list.id}`)}
                            className="flex-1 text-xs font-bold py-1.5 border border-white/10 hover:border-white/30 transition-colors"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            onClick={() => templateStoreTripId && handleDeleteMyTemplate(list.id, templateStoreTripId)}
                            disabled={myPackingDeleting === list.id}
                            className="text-xs font-bold py-1.5 px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <form onSubmit={handlePackingSearch} className="flex gap-2 flex-1">
                  <Input
                    value={packingSearchQ}
                    onChange={(e) => setPackingSearchQ(e.target.value)}
                    placeholder={t("templates.searchPlaceholder")}
                    className="flex-1"
                  />
                  <Button type="submit" variant="gradient">{t("common.search")}</Button>
                </form>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setPackingTypeFilter("")}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                      packingTypeFilter === "" ? "bg-teal-500 border-teal-500 text-black font-bold" : "border-white/20 hover:bg-white/5"
                    }`}
                  >
                    {t("common.all")}
                  </button>
                  {TRIP_TYPES.map((type) => {
                    const FilterIcon = TYPE_ICONS[type] ?? Building2;
                    return (
                      <button
                        key={type}
                        onClick={() => setPackingTypeFilter(type)}
                        className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                          packingTypeFilter === type ? "bg-teal-500 border-teal-500 text-black font-bold" : "border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <FilterIcon className="w-3.5 h-3.5 shrink-0" />
                        {t(`trips.types.${type}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {packingLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">{t("common.loading")}</div>
              ) : packingTemplates.length === 0 ? (
                <div className="bg-white/5 border border-white/10 p-16 text-center">
                  <Backpack className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("templates.noPackingTemplates")}</h2>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">{t("templates.noPackingTemplatesSubtitle")}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packingTemplates.map((tpl) => {
                    const effectiveType = tpl.tripCategory ?? tpl.trip?.type;
                    const TripTypeIcon = effectiveType ? (TYPE_ICONS[effectiveType] ?? Building2) : null;
                    return (
                      <Card key={tpl.id} className="p-6 flex flex-col justify-between hover:border-teal-500 transition-all cursor-pointer" onClick={() => openPackingPreview(tpl)}>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl font-bold">{tpl.name}</h3>
                            {effectiveType && TripTypeIcon && (
                              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex-shrink-0 flex items-center gap-1">
                                <TripTypeIcon className="w-3.5 h-3.5 shrink-0" />
                                {t(`trips.types.${effectiveType}`)}
                              </span>
                            )}
                          </div>
                          {tpl.templateDescription && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-3">{tpl.templateDescription}</p>
                          )}
                          <div className="flex gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 shrink-0" /> {tpl._count.items} {t("templates.items")}</span>
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">{t("templates.by")} {tpl.createdBy.name || tpl.createdBy.email}</p>
                            {tpl.templateUseCount > 0 && (
                              <p className="text-xs text-teal-500">{tpl.templateUseCount}× {t("templates.used")}</p>
                            )}
                          </div>
                          <Button variant="gradient" size="sm" onClick={(e) => { e.stopPropagation(); openPackingPreview(tpl); }}>
                            {t("templates.preview")}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── TRIP TEMPLATE MODAL ──────────────────────────── */}
      {modalStep && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div
            className="bg-[#111] border border-white/15 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {modalStep === "preview" && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
                  {previewLoading || !previewData ? (
                    <div className="text-gray-400 text-sm">{t("common.loading")}</div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h2 className="text-2xl font-black tracking-tight">{previewData.name}</h2>
                        {previewData.type && (
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex-shrink-0 mt-1 flex items-center gap-1">
                            <ModalTypeIcon className="w-3.5 h-3.5 shrink-0" />
                            {t(`trips.types.${previewData.type}`)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                        {previewData.destination && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {previewData.destination}</span>}
                        {tripDurationDays(previewData) && (
                          <span className="text-teal-400 font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" /> {tripDurationDays(previewData)} {tripDurationDays(previewData) === 1 ? t("templates.day") : t("templates.days")}</span>
                        )}
                        <span className="text-gray-500">{t("templates.by")} {previewData.owner.name || previewData.owner.email}</span>
                      </div>
                      {(previewData.templateDescription || previewData.description) && (
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                          {previewData.templateDescription || previewData.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {!previewLoading && previewData && tabs.length > 0 && (
                  <div className="flex border-b border-white/10 flex-shrink-0 overflow-x-auto">
                    {tabs.map((tab) => {
                      const TabIcon = tab.Icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
                            activeTab === tab.key
                              ? "border-teal-400 text-teal-400"
                              : "border-transparent text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          <TabIcon className="w-3.5 h-3.5 shrink-0" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="overflow-y-auto flex-1 px-6 py-4">
                  {previewLoading && (
                    <div className="flex items-center justify-center h-32 text-gray-500">{t("common.loading")}</div>
                  )}
                  {!previewLoading && previewData && (
                    <>
                      {activeTab === "itinerary" && (
                        <div className="space-y-1">
                          {hasItinerary ? (
                            Array.from(itineraryByDay.entries()).map(([day, items]) => (
                              <div key={day} className="mb-4">
                                <div className="text-xs uppercase tracking-wider text-teal-400 font-bold py-1.5 px-2 bg-teal-500/10 mb-2">{day}</div>
                                {items.map((item) => {
                                  const CatIcon = CATEGORY_ICONS[item.category || ""] ?? Target;
                                  return (
                                    <div key={item.id} className="flex gap-3 py-2 px-2 hover:bg-white/3 rounded">
                                      <CatIcon className="w-5 h-5 shrink-0 mt-0.5 text-gray-400" />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-sm text-white">{item.title}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                          {!item.isAllDay && (
                                            <span className="text-xs text-gray-500">{formatTime(item.startTime)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ""}</span>
                                          )}
                                          {item.location && (
                                            <span className="text-xs text-gray-500 flex items-center gap-0.5"><MapPin className="w-3 h-3 shrink-0" /> {item.location}</span>
                                          )}
                                        </div>
                                        {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">{t("templates.noContent")}</p>
                          )}
                        </div>
                      )}
                      {activeTab === "transport" && (
                        <div className="space-y-3">
                          {hasTransport ? previewData.transports.map((leg) => {
                            const TransIcon = TRANSPORT_ICONS[leg.mode] ?? Plane;
                            return (
                              <div key={leg.id} className="border border-white/10 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <TransIcon className="w-5 h-5 shrink-0" />
                                  <span className="font-semibold text-sm">{leg.departureLocation} → {leg.arrivalLocation}</span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 ml-7">
                                  <span>{formatTime(leg.departureTime)} → {formatTime(leg.arrivalTime)}</span>
                                  {leg.cost != null && <span>{leg.cost} {previewData.currency}</span>}
                                  {leg.notes && <span className="text-gray-600">{leg.notes}</span>}
                                </div>
                              </div>
                            );
                          }) : <p className="text-gray-500 text-sm">{t("templates.noContent")}</p>}
                        </div>
                      )}
                      {activeTab === "stages" && (
                        <div className="space-y-3">
                          {hasStages ? previewData.stages.map((s) => (
                            <div key={s.id} className="border border-white/10 p-3">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs text-teal-400 font-bold uppercase">Stage {s.order}</span>
                                <span className="font-semibold text-sm">{s.title}</span>
                              </div>
                              {(s.startLocation || s.endLocation) && (
                                <p className="text-xs text-gray-500 mb-1">{s.startLocation || "?"} → {s.endLocation || "?"}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {s.distance != null && <span className="text-xs bg-white/5 px-2 py-0.5">{s.distance} km</span>}
                                {s.elevationGain != null && <span className="text-xs bg-white/5 px-2 py-0.5">↑{s.elevationGain}m</span>}
                                {s.elevationLoss != null && <span className="text-xs bg-white/5 px-2 py-0.5">↓{s.elevationLoss}m</span>}
                                {s.duration != null && <span className="text-xs bg-white/5 px-2 py-0.5">{formatDuration(s.duration)}</span>}
                                {s.difficulty && <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-0.5 capitalize">{s.difficulty}</span>}
                              </div>
                              {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                            </div>
                          )) : <p className="text-gray-500 text-sm">{t("templates.noContent")}</p>}
                        </div>
                      )}
                      {activeTab === "packing" && (
                        <div className="space-y-4">
                          {hasPacking ? previewData.packingLists.filter(l => !l.isPrivate).map((list) => (
                            <div key={list.id}>
                              <h4 className="font-bold text-sm mb-2">{list.name}</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {list.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="w-3 h-3 border border-white/20 flex-shrink-0" />
                                    <span>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )) : <p className="text-gray-500 text-sm">{t("templates.noContent")}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button variant="gradient" className="flex-1" disabled={previewLoading || !previewData} onClick={() => setModalStep("create")}>
                    {t("templates.useTemplate")} →
                  </Button>
                  <Button variant="ghost" onClick={closeModal}>{t("common.cancel")}</Button>
                </div>
              </>
            )}

            {modalStep === "create" && previewData && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
                  <button onClick={() => setModalStep("preview")} className="text-xs text-gray-500 hover:text-gray-300 mb-3 flex items-center gap-1 transition-colors">
                    ← {t("templates.backToPreview")}
                  </button>
                  <h2 className="text-2xl font-black tracking-tight">{t("templates.useTemplateTitle")}</h2>
                  <p className="text-gray-400 text-sm mt-1">{previewData.name}</p>
                </div>
                <form id="use-template-form" onSubmit={handleUseTemplate} className="px-6 py-6 space-y-4 overflow-y-auto flex-1">
                  {createError && <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{createError}</div>}
                  <div>
                    <Label htmlFor="newName">{t("trips.tripName")}</Label>
                    <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="newStartDate">{t("templates.newStartDate")} *</Label>
                    <Input id="newStartDate" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} required />
                    {previewData.startDate && previewData.endDate && (
                      <p className="text-xs text-gray-500 mt-1">{t("templates.datesWillShift")}</p>
                    )}
                  </div>
                </form>
                <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                  <Button type="submit" form="use-template-form" variant="gradient" disabled={isCreating} className="flex-1">
                    {isCreating ? t("common.loading") : t("templates.createFromTemplate")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={closeModal}>{t("common.cancel")}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PACKING TEMPLATE MODAL ───────────────────────── */}
      {packingModalOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50" onClick={() => setPackingModalOpen(false)}>
          <div className="bg-[#111] border border-white/15 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
              {packingPreviewLoading || !packingPreview ? (
                <div className="text-gray-400 text-sm">{t("common.loading")}</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h2 className="text-2xl font-black tracking-tight">{packingPreview.name}</h2>
                    {packingPreview.trip?.type && (() => {
                      const TIcon = TYPE_ICONS[packingPreview.trip!.type!] ?? Building2;
                      return (
                        <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex-shrink-0 mt-1 flex items-center gap-1">
                          <TIcon className="w-3.5 h-3.5 shrink-0" />
                          {t(`trips.types.${packingPreview.trip.type}`)}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{t("templates.by")} {packingPreview.createdBy.name || packingPreview.createdBy.email}</span>
                    <span>·</span>
                    <span>{packingPreview.items.length} {t("templates.items")}</span>
                    {packingPreview.templateUseCount > 0 && (
                      <><span>·</span><span className="text-teal-500">{packingPreview.templateUseCount}× {t("templates.used")}</span></>
                    )}
                  </div>
                  {packingPreview.templateDescription && (
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed">{packingPreview.templateDescription}</p>
                  )}
                </>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {packingPreviewLoading && (
                <div className="flex items-center justify-center h-32 text-gray-500">{t("common.loading")}</div>
              )}
              {!packingPreviewLoading && packingPreview && (
                <div className="space-y-4">
                  {Object.entries(packingItemsByCategory).map(([category, items]) => (
                    <div key={category}>
                      <div className="text-xs uppercase tracking-wider text-teal-400 font-bold py-1 px-2 bg-teal-500/10 mb-2">{category}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-gray-400 py-0.5">
                            {item.categoryEmoji ? (
                              <span className="text-base shrink-0">{item.categoryEmoji}</span>
                            ) : (
                              <span className="w-3 h-3 border border-white/20 flex-shrink-0" />
                            )}
                            <span>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 space-y-3">
              <div className="flex gap-2">
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-white/20 text-white px-3 py-2 text-sm"
                >
                  <option value="">{t("templates.selectTrip")}</option>
                  {userTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>{trip.name}</option>
                  ))}
                </select>
                <Button
                  variant="gradient"
                  disabled={!selectedTripId || addingToTrip || !packingPreview}
                  onClick={handleAddPackingToTrip}
                >
                  {addingToTrip ? t("templates.addingToTrip") : t("templates.addToTrip")}
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setPackingModalOpen(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW TEMPLATE DIALOG ──────────────────────────── */}
      {newTemplateDialogOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50" onClick={() => setNewTemplateDialogOpen(false)}>
          <div className="bg-[#111] border border-white/15 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <h2 className="text-xl font-black tracking-tight">{t("templates.newTemplate")}</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">{t("common.name")}</Label>
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateTemplate(); }}
                  autoFocus
                  className="bg-[#1a1a1a] border-white/20"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                  {t("templates.tripType")} <span className="text-gray-600 normal-case">({t("templates.optional")})</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTemplateCategory("")}
                    className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
                      newTemplateCategory === ""
                        ? "border-teal-500 bg-teal-500/20 text-teal-400"
                        : "border-white/15 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    {t("templates.anyTripType")}
                  </button>
                  {TRIP_TYPES.map((type) => {
                    const Icon = TYPE_ICONS[type] ?? Building2;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewTemplateCategory(type)}
                        className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border transition-colors flex items-center justify-center gap-1.5 ${
                          newTemplateCategory === type
                            ? "border-teal-500 bg-teal-500/20 text-teal-400"
                            : "border-white/15 text-gray-400 hover:border-white/30"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {t(`trips.types.${type}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <Button
                variant="gradient"
                className="flex-1"
                disabled={!newTemplateName.trim() || newTemplateCreating}
                onClick={handleCreateTemplate}
              >
                {newTemplateCreating ? t("common.loading") : t("templates.createTemplate")}
              </Button>
              <Button variant="ghost" onClick={() => setNewTemplateDialogOpen(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    }>
      <TemplatesPageInner />
    </Suspense>
  );
}
