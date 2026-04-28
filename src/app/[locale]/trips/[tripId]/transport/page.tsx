"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { TripNav } from "@/components/TripNav";
import { AppHeader } from "@/components/AppHeader";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PageTransition } from "@/components/PageTransition";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { TRANSPORT_MODES } from "@/lib/validations/transport";
import { parseGoogleMapsLink, isGoogleShortLink } from "@/lib/maps-link-parser";
import { Linkify } from "@/components/ui/linkify";
import type { LucideIcon } from "lucide-react";
import { Plane, TrainFront, Bus, Car, Ship, Bike, Footprints, Rocket, MapPin, PlaneTakeoff, PlaneLanding, Clock, Pencil, Trash2, MoreVertical } from "lucide-react";

interface Transport {
  id: string;
  order: number;
  title: string;
  mode: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  bookingReference: string | null;
  notes: string | null;
  cost: number | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface TripMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

function getModeIcon(mode: string): LucideIcon {
  switch (mode) {
    case "plane": return Plane;
    case "train": return TrainFront;
    case "bus": return Bus;
    case "car": return Car;
    case "ferry": return Ship;
    case "bike": return Bike;
    case "walk": return Footprints;
    case "taxi": return Car;
    default: return Plane;
  }
}

function formatDuration(departure: string, arrival: string): string {
  const diff = new Date(arrival).getTime() - new Date(departure).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDatetimeString(dateStr: string): string {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TransportPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const tripId = params.tripId as string;

  const { toasts, toast, removeToast } = useToast();

  const [transports, setTransports] = useState<Transport[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [editSplitMemberIds, setEditSplitMemberIds] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addFormRef = useRef<HTMLFormElement>(null);
  const [mapsLinkValue, setMapsLinkValue] = useState("");
  const [mapsLoading, setMapsLoading] = useState(false);
  const [openMenuTransportId, setOpenMenuTransportId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale]);

  useEffect(() => {
    if (session && tripId) {
      fetchTransports();
      localStorage.setItem(`seen_${tripId}_transport`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchTransports() {
    try {
      const [transportRes, tripRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/transport`),
        fetch(`/api/trips/${tripId}`),
      ]);
      if (!transportRes.ok) throw new Error("Failed to fetch transports");
      const data = await transportRes.json();
      setTransports(data.transports);
      if (data.userRole) setUserRole(data.userRole);
      if (data.tripStartDate) setTripStartDate(new Date(data.tripStartDate).toISOString().slice(0, 16));
      if (tripRes.ok) {
        const tripData = await tripRes.json();
        const tripMembers: TripMember[] = tripData.trip?.members ?? [];
        setMembers(tripMembers);
        const allIds = tripMembers.map((m) => m.userId);
        setSplitMemberIds(allIds);
        setEditSplitMemberIds(allIds);
      }
    } catch (error) {
      console.error("Error fetching transports:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddTransport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const costStr = formData.get("cost") as string;

    const data = {
      title: formData.get("title") as string,
      mode: formData.get("mode") as string,
      departureLocation: formData.get("departureLocation") as string,
      arrivalLocation: formData.get("arrivalLocation") as string,
      departureTime: new Date(formData.get("departureTime") as string).toISOString(),
      arrivalTime: new Date(formData.get("arrivalTime") as string).toISOString(),
      bookingReference: (formData.get("bookingReference") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      cost: costStr ? parseFloat(costStr) : undefined,
      splitMemberIds: costStr ? splitMemberIds : undefined,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/transport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create transport");
      }

      setShowAddModal(false);
      setSplitMemberIds(members.map((m) => m.userId));
      toast.success(t("transport.added"));
      fetchTransports();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditTransport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTransport) return;
    setError("");

    const formData = new FormData(e.currentTarget);
    const costStr = formData.get("cost") as string;

    const data = {
      id: editingTransport.id,
      title: formData.get("title") as string,
      mode: formData.get("mode") as string,
      departureLocation: formData.get("departureLocation") as string,
      arrivalLocation: formData.get("arrivalLocation") as string,
      departureTime: new Date(formData.get("departureTime") as string).toISOString(),
      arrivalTime: new Date(formData.get("arrivalTime") as string).toISOString(),
      bookingReference: (formData.get("bookingReference") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      cost: costStr ? parseFloat(costStr) : null,
      splitMemberIds: costStr ? editSplitMemberIds : [],
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/transport`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update transport");
      }

      setShowEditModal(false);
      setEditingTransport(null);
      toast.success(t("transport.updated"));
      fetchTransports();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTransport(id: string) {
    try {
      const response = await fetch(`/api/trips/${tripId}/transport?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete transport");

      setShowDeleteConfirm(null);
      toast.success(t("transport.deleted"));
      fetchTransports();
    } catch (error) {
      console.error("Error deleting transport:", error);
      toast.error(t("transport.deleteFailed"));
    }
  }

  function applyMapsResult(result: ReturnType<typeof parseGoogleMapsLink>) {
    if (!result) return;

    const form = addFormRef.current;
    if (!form) return;

    if (result.title) {
      const titleInput = form.querySelector<HTMLInputElement>('[name="title"]');
      if (titleInput && !titleInput.value) {
        titleInput.value = result.title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (result.departureLocation) {
      const depInput = form.querySelector<HTMLInputElement>('[name="departureLocation"]');
      if (depInput) {
        depInput.value = result.departureLocation;
        depInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (result.arrivalLocation) {
      const arrInput = form.querySelector<HTMLInputElement>('[name="arrivalLocation"]');
      if (arrInput) {
        arrInput.value = result.arrivalLocation;
        arrInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (result.mode) {
      const modeSelect = form.querySelector<HTMLSelectElement>('[name="mode"]');
      if (modeSelect) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(modeSelect, result.mode);
          modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    setMapsLinkValue("");
  }

  async function handleMapsLink(value: string) {
    setMapsLinkValue(value);
    if (!value.trim()) return;

    let urlToparse = value;

    // Short links need server-side redirect resolution
    if (isGoogleShortLink(value)) {
      setMapsLoading(true);
      try {
        const res = await fetch("/api/resolve-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          urlToparse = data.url;
        }
      } catch {
        // ignore, try parsing original
      } finally {
        setMapsLoading(false);
      }
    }

    applyMapsResult(parseGoogleMapsLink(urlToparse));
  }

  const canModify = (creatorId: string) =>
    userRole === "OWNER" || userRole === "ADMIN" || creatorId === session?.user?.id;

  // Summary calculations
  const totalCost = transports.reduce((sum, t) => sum + (t.cost || 0), 0);
  const now = new Date();
  const nextDeparture = transports.find(
    (t) => new Date(t.departureTime) > now
  );

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) return null;

  function renderForm(isEdit: boolean, transport?: Transport | null) {
    return (
      <form id={isEdit ? "edit-transport-form" : "add-transport-form"} ref={isEdit ? undefined : addFormRef} onSubmit={isEdit ? handleEditTransport : handleAddTransport} className="space-y-4">
        {!isEdit && (
          <div className="border-2 border-dashed border-white/20 hover:border-teal-500/50 p-4 transition-colors">
            <input
              type="text"
              value={mapsLinkValue}
              onChange={(e) => handleMapsLink(e.target.value)}
              placeholder={t("transport.pasteGoogleMaps")}
              className="w-full bg-transparent text-sm text-gray-400 placeholder-gray-600 outline-none"
            />
            <p className="text-xs text-gray-600 mt-1">
              {mapsLoading ? (
                <span className="text-teal-400">{t("common.loading")}</span>
              ) : (
                t("transport.mapsHint")
              )}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>
        )}

        <div>
          <Label htmlFor={isEdit ? "editTitle" : "title"}>{t("transport.transportTitle")} *</Label>
          <Input
            id={isEdit ? "editTitle" : "title"}
            name="title"
            placeholder="Berlin → Munich"
            defaultValue={transport?.title || ""}
            required
          />
        </div>

        <div>
          <Label htmlFor={isEdit ? "editMode" : "mode"}>{t("transport.mode")} *</Label>
          <Select
            id={isEdit ? "editMode" : "mode"}
            name="mode"
            defaultValue={transport?.mode || "train"}
            required
          >
            {TRANSPORT_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`transport.modes.${m}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={isEdit ? "editDepartureLocation" : "departureLocation"}>{t("transport.departureLocation")} *</Label>
            <Input
              id={isEdit ? "editDepartureLocation" : "departureLocation"}
              name="departureLocation"
              placeholder="Berlin HBF"
              defaultValue={transport?.departureLocation || ""}
              required
            />
          </div>
          <div>
            <Label htmlFor={isEdit ? "editArrivalLocation" : "arrivalLocation"}>{t("transport.arrivalLocation")} *</Label>
            <Input
              id={isEdit ? "editArrivalLocation" : "arrivalLocation"}
              name="arrivalLocation"
              placeholder="Munich HBF"
              defaultValue={transport?.arrivalLocation || ""}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={isEdit ? "editDepartureTime" : "departureTime"}>{t("transport.departureTime")} *</Label>
            <Input
              id={isEdit ? "editDepartureTime" : "departureTime"}
              name="departureTime"
              type="datetime-local"
              defaultValue={transport ? toLocalDatetimeString(transport.departureTime) : ""}
              min={tripStartDate || undefined}
              required
            />
          </div>
          <div>
            <Label htmlFor={isEdit ? "editArrivalTime" : "arrivalTime"}>{t("transport.arrivalTime")} *</Label>
            <Input
              id={isEdit ? "editArrivalTime" : "arrivalTime"}
              name="arrivalTime"
              type="datetime-local"
              defaultValue={transport ? toLocalDatetimeString(transport.arrivalTime) : ""}
              min={tripStartDate || undefined}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={isEdit ? "editBookingReference" : "bookingReference"}>{t("transport.bookingReference")}</Label>
            <Input
              id={isEdit ? "editBookingReference" : "bookingReference"}
              name="bookingReference"
              placeholder="ABC123"
              defaultValue={transport?.bookingReference || ""}
            />
          </div>
          <div>
            <Label htmlFor={isEdit ? "editCost" : "cost"}>{t("transport.cost")}</Label>
            <Input
              id={isEdit ? "editCost" : "cost"}
              name="cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="49.90"
              defaultValue={transport?.cost || ""}
            />
          </div>
        </div>

        <div>
          <Label htmlFor={isEdit ? "editNotes" : "notes"}>{t("transport.notes")}</Label>
          <Input
            id={isEdit ? "editNotes" : "notes"}
            name="notes"
            placeholder="Platform 5, Car 12..."
            defaultValue={transport?.notes || ""}
          />
        </div>

        {members.length > 0 && (
          <div>
            <Label className="mb-2 block">{t("expenses.splitBetween")}</Label>
            <div className="space-y-2">
              {members.map((m) => {
                const ids = isEdit ? editSplitMemberIds : splitMemberIds;
                const setIds = isEdit ? setEditSplitMemberIds : setSplitMemberIds;
                return (
                  <label key={m.userId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={ids.includes(m.userId)}
                      onChange={(e) =>
                        setIds(e.target.checked
                          ? [...ids, m.userId]
                          : ids.filter((id) => id !== m.userId))
                      }
                    />
                    <span className="text-sm">{m.user.name || m.user.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

      </form>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader backHref={`/trips/${tripId}`} />

      <TripNav tripId={tripId} currentSection="transport" />

      <PageTransition section="transport" tripId={tripId}>
      <main className="px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
                <Rocket className="w-8 h-8 md:w-10 md:h-10" />{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("transport.title")}
                </span>
              </h1>
              <p className="text-lg text-gray-400">
                {transports.length} {t("transport.totalTransports")}
              </p>
            </div>
            <Button onClick={() => { setError(""); setShowAddModal(true); }} variant="gradient" size="lg">
              {t("transport.addTransport")}
            </Button>
          </div>

          {/* Summary Bar */}
          {transports.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("transport.totalTransports")}</p>
                <p className="text-2xl font-black text-white">{transports.length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("transport.totalCost")}</p>
                <p className="text-2xl font-black text-teal-400">
                  {totalCost > 0 ? `${totalCost.toFixed(2)} \u20AC` : "\u2014"}
                </p>
              </Card>
              <Card className="p-4 text-center col-span-2 md:col-span-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("transport.nextDeparture")}</p>
                <p className="text-lg font-black text-amber-400">
                  {nextDeparture
                    ? formatDateTime(nextDeparture.departureTime, locale)
                    : "\u2014"}
                </p>
              </Card>
            </div>
          )}

          {/* Transport List */}
          {transports.length === 0 ? (
            <Card className="p-16 text-center">
              <Plane className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
              <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("transport.noTransports")}</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">{t("transport.noTransportsSubtitle")}</p>
              <Button onClick={() => { setError(""); setShowAddModal(true); }} variant="gradient" size="lg">
                {t("transport.addFirstTransport")}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {transports.map((transport) => {
                const ModeIcon = getModeIcon(transport.mode);
                return (
                <Card key={transport.id} className="p-0 overflow-hidden">
                  <div className="flex">
                    {/* Mode sidebar */}
                    <div className="w-16 md:w-20 bg-gradient-to-b from-teal-500/20 to-emerald-500/20 border-r border-white/10 flex flex-col items-center justify-center flex-shrink-0">
                      <ModeIcon className="w-8 h-8 md:w-10 md:h-10" />
                      <span className="text-[10px] text-gray-500 uppercase mt-1">
                        {t(`transport.modes.${transport.mode}`)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 md:p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-2">
                          <h3 className="text-xl md:text-2xl font-bold tracking-tight">{transport.title}</h3>
                          <div className="flex gap-2 flex-shrink-0">
                            {transport.cost != null && transport.cost > 0 && (
                              <span className="px-2 py-0.5 text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/50">
                                {transport.cost.toFixed(2)} &euro;
                              </span>
                            )}
                            {transport.bookingReference && (
                              <span className="px-2 py-0.5 text-xs bg-white/10 border border-white/20 font-mono">
                                {transport.bookingReference}
                              </span>
                            )}
                          </div>
                        </div>
                        {canModify(transport.createdBy.id) && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setOpenMenuTransportId(openMenuTransportId === transport.id ? null : transport.id)}
                            className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                          ><MoreVertical className="w-4 h-4" /></button>
                          {openMenuTransportId === transport.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuTransportId(null)} />
                              <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
                                <button
                                  onClick={() => { setEditingTransport(transport); setError(""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); setOpenMenuTransportId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                >
                                  <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
                                </button>
                                <button
                                  onClick={() => { setShowDeleteConfirm(transport.id); setOpenMenuTransportId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        )}
                      </div>

                      {/* Route */}
                      <p className="text-gray-400 mb-2 flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 shrink-0" /> {transport.departureLocation} &rarr; {transport.arrivalLocation}
                      </p>

                      {/* Times */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-teal-400 font-semibold flex items-center gap-1">
                          <PlaneTakeoff className="w-4 h-4 shrink-0" /> {formatDateTime(transport.departureTime, locale)}
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <PlaneLanding className="w-4 h-4 shrink-0" /> {formatDateTime(transport.arrivalTime, locale)}
                        </span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-4 h-4 shrink-0" /> {formatDuration(transport.departureTime, transport.arrivalTime)}
                        </span>
                      </div>

                      {transport.notes && (
                        <div className="text-gray-500 mt-3 text-sm"><Linkify>{transport.notes}</Linkify></div>
                      )}

                    </div>
                  </div>
                </Card>
              ); })}
            </div>
          )}
        </div>
      </main>

      </PageTransition>

      {/* Add Transport Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <Modal.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tight">{t("transport.addTransportModal")}</h2>
            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white text-2xl">{"\u2715"}</button>
          </div>
        </Modal.Header>
        <Modal.Body>{renderForm(false)}</Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="add-transport-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("transport.addTransport")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Transport Modal */}
      {editingTransport && <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingTransport(null); }}>
        <Modal.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tight">{t("transport.editTransport")}</h2>
            <button onClick={() => { setShowEditModal(false); setEditingTransport(null); }} className="text-gray-500 hover:text-white text-2xl">{"\u2715"}</button>
          </div>
        </Modal.Header>
        <Modal.Body>{renderForm(true, editingTransport)}</Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="edit-transport-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.saveChanges")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingTransport(null); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={t("transport.deleteTransport")}
          message={t("transport.deleteConfirm")}
          onConfirm={() => handleDeleteTransport(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
