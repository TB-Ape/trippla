"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Linkify } from "@/components/ui/linkify";
import { TripNav } from "@/components/TripNav";
import { AppHeader } from "@/components/AppHeader";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { PageTransition } from "@/components/PageTransition";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Hotel, MapPin, Pencil, Trash2, Wallet, MoreVertical, BedDouble } from "lucide-react";

interface AccommodationItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  category: string | null;
  isAllDay: boolean;
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

export default function AccommodationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const tripId = params.tripId as string;

  const { toasts, toast, removeToast } = useToast();
  const sidebar = useSidebarState();

  const [items, setItems] = useState<AccommodationItem[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AccommodationItem | null>(null);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [selectedItem, setSelectedItem] = useState<AccommodationItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [editSplitMemberIds, setEditSplitMemberIds] = useState<string[]>([]);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router]);

  useEffect(() => {
    if (session && tripId) {
      fetchItems();
      localStorage.setItem(`seen_${tripId}_accommodations`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchItems() {
    try {
      const [itineraryRes, tripRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/itinerary`),
        fetch(`/api/trips/${tripId}`),
      ]);
      if (!itineraryRes.ok) {
        if (itineraryRes.status === 404) {
          router.push(`/${locale}/trips`);
          return;
        }
        throw new Error("Failed to fetch accommodations");
      }
      const data = await itineraryRes.json();
      setItems(data.items.filter((item: AccommodationItem) => item.category === "accommodation"));
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
      console.error("Error fetching accommodations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const endTime = formData.get("endTime") as string;
    const startTime = formData.get("startTime") as string;

    if (endTime && new Date(endTime) < new Date(startTime)) {
      setError(t("itinerary.endBeforeStart"));
      return;
    }

    const costStr = formData.get("cost") as string;
    const data = {
      title: formData.get("title") as string,
      description: description || undefined,
      location: location || undefined,
      startTime,
      endTime: endTime || undefined,
      category: "accommodation",
      isAllDay: formData.get("isAllDay") === "on",
      cost: costStr ? parseFloat(costStr) : undefined,
      splitMemberIds: costStr ? splitMemberIds : undefined,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add accommodation");
      }

      setShowAddModal(false);
      setLocation("");
      setSplitMemberIds(members.map((m) => m.userId));
      toast.success(t("accommodations.added"));
      fetchItems();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingItem) return;
    setError("");

    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const endTime = formData.get("endTime") as string;
    const startTime = formData.get("startTime") as string;

    if (endTime && new Date(endTime) < new Date(startTime)) {
      setError(t("itinerary.endBeforeStart"));
      return;
    }

    const costStr = formData.get("cost") as string;
    const data = {
      id: editingItem.id,
      title: formData.get("title") as string,
      description: description || undefined,
      location: editLocation || undefined,
      startTime,
      endTime: endTime || undefined,
      category: "accommodation",
      isAllDay: formData.get("isAllDay") === "on",
      cost: costStr ? parseFloat(costStr) : null,
      splitMemberIds: costStr ? editSplitMemberIds : [],
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update accommodation");
      }

      setShowEditModal(false);
      setEditingItem(null);
      toast.success(t("accommodations.updated"));
      fetchItems();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const response = await fetch(
        `/api/trips/${tripId}/itinerary?id=${itemId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete accommodation");
      }

      setShowDeleteConfirm(null);
      toast.success(t("accommodations.deleted"));
      fetchItems();
    } catch (error) {
      console.error("Error deleting accommodation:", error);
      toast.error(t("accommodations.deleteFailed"));
    }
  }

  function formatDate(dateString: string, isAllDay: boolean) {
    const date = new Date(dateString);
    if (isAllDay) {
      return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return date.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getGoogleMapsUrl(location: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  const canModify = (creatorId: string) =>
    userRole === "OWNER" || userRole === "ADMIN" || creatorId === session?.user?.id;

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
      <AppHeader backHref={`/trips/${tripId}`} onMobileMenuToggle={sidebar.toggle} />

      <TripNav tripId={tripId} currentSection="accommodations" mobileOpen={sidebar.isOpen} onMobileClose={sidebar.close} />

      <PageTransition section="accommodations" tripId={tripId} className="sm:pl-14">
        {/* Page Header */}
        <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter flex items-center gap-3">
                  <BedDouble className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                    {t("accommodations.title")}
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400">
                  {items.length} {items.length === 1 ? t("common.item") : t("common.items")}
                </p>
              </div>

              <Button
                onClick={() => setShowAddModal(true)}
                variant="gradient"
                size="lg"
              >
                + {t("accommodations.add")}
              </Button>
            </div>
          </div>
        </div>

        {/* Accommodations List */}
        <main className="px-4 md:px-8 py-6 md:py-12">
          <div className="max-w-6xl mx-auto">
            {items.length === 0 ? (
              <div className="bg-white/5 border border-white/10 p-8 md:p-16 text-center">
                <Hotel className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
                <h2 className="text-3xl font-bold mb-4 tracking-tight">
                  {t("accommodations.noItems")}
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  {t("accommodations.noItemsSubtitle")}
                </p>
                <Button onClick={() => setShowAddModal(true)} variant="gradient">
                  {t("accommodations.addFirst")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="p-6 hover:border-teal-500 transition-all cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex gap-4 md:gap-6">
                      {/* Date Column */}
                      <div className="flex-shrink-0 w-20 md:w-32 flex flex-col items-end">
                        <Hotel className="w-4 h-4 text-teal-400" />
                        <div className="text-xs md:text-sm text-gray-400 mt-2">
                          {item.isAllDay ? (
                            <span className="font-bold">{t("common.allDay")}</span>
                          ) : (
                            <div>
                              {new Date(item.startTime).toLocaleTimeString(locale, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          {new Date(item.startTime).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0 border-l-2 border-teal-500/30 pl-4 md:pl-6">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-xl md:text-2xl font-bold">{item.title}</h3>
                          {canModify(item.createdBy.id) && (
                            <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                                className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                              ><MoreVertical className="w-4 h-4" /></button>
                              {openMenuItemId === item.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
                                  <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
                                    <button
                                      onClick={() => { setEditingItem(item); setEditLocation(item.location || ""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); setOpenMenuItemId(null); }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
                                    </button>
                                    <button
                                      onClick={() => { setShowDeleteConfirm(item.id); setOpenMenuItemId(null); }}
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

                        {item.endTime && (
                          <div className="text-sm text-gray-400 mb-2">
                            {t("accommodations.checkIn")}: {formatDate(item.startTime, item.isAllDay)}
                            {" → "}
                            {t("accommodations.checkOut")}: {formatDate(item.endTime, item.isAllDay)}
                          </div>
                        )}

                        {item.location && (
                          <a
                            href={getGoogleMapsUrl(item.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 flex items-center gap-2 mb-2 hover:text-teal-400 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}
                          </a>
                        )}

                        {item.description && (
                          <div className="text-gray-300 mb-3">
                            <Linkify className="line-clamp-2">{item.description}</Linkify>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>
                            {t("common.addedBy")} {item.createdBy.name || item.createdBy.email}
                          </span>
                          {item.cost != null && (
                            <span className="inline-flex items-center gap-1 text-teal-400 font-semibold">
                              <Wallet className="w-3.5 h-3.5 shrink-0" /> {item.cost.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </PageTransition>

      {/* Add Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setError(""); }} maxWidth="max-w-lg">
        <Modal.Header>
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-black tracking-tight">
              {t("accommodations.addModal").split(" ")[0]}{" "}
              <span className="text-teal-400">{t("accommodations.addModal").split(" ").slice(1).join(" ")}</span>
            </h2>
            <button onClick={() => { setShowAddModal(false); setError(""); }} className="text-3xl leading-none hover:text-teal-400 transition-colors flex-shrink-0 ml-2">&times;</button>
          </div>
        </Modal.Header>
        <Modal.Body>
            <form id="add-accommodation-form" onSubmit={handleAddItem} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="title">{t("accommodations.name")} *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={t("accommodations.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t("itinerary.description")}</Label>
                <textarea
                  id="description"
                  name="description"
                  placeholder={t("itinerary.description")}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500 transition-colors min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="location">{t("itinerary.location")}</Label>
                <LocationAutocomplete
                  id="location"
                  name="location"
                  value={location}
                  onChange={setLocation}
                  placeholder={t("itinerary.searchLocation")}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isAllDay"
                  name="isAllDay"
                  defaultChecked
                  className="w-5 h-5"
                />
                <Label htmlFor="isAllDay" className="cursor-pointer">
                  {t("itinerary.allDayEvent")}
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">{t("accommodations.checkIn")} *</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    min={tripStartDate || undefined}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">{t("accommodations.checkOut")}</Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    min={tripStartDate || undefined}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cost">{t("accommodations.cost")}</Label>
                <Input id="cost" name="cost" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>

              {members.length > 0 && (
                <div>
                  <Label className="mb-2 block">{t("expenses.splitBetween")}</Label>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={splitMemberIds.includes(m.userId)}
                          onChange={(e) =>
                            setSplitMemberIds(e.target.checked
                              ? [...splitMemberIds, m.userId]
                              : splitMemberIds.filter((id) => id !== m.userId))
                          }
                        />
                        <span className="text-sm">{m.user.name || m.user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="add-accommodation-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("accommodations.add")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setError(""); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      {editingItem && <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingItem(null); setError(""); }} maxWidth="max-w-lg">
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("accommodations.editModal").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("accommodations.editModal").split(" ").slice(1).join(" ")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
            <form id="edit-accommodation-form" onSubmit={handleEditItem} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="edit-title">{t("accommodations.name")} *</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editingItem.title}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">{t("itinerary.description")}</Label>
                <textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingItem.description || ""}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500 transition-colors min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="edit-location">{t("itinerary.location")}</Label>
                <LocationAutocomplete
                  id="edit-location"
                  name="location"
                  value={editLocation}
                  onChange={setEditLocation}
                  placeholder={t("itinerary.searchLocation")}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-isAllDay"
                  name="isAllDay"
                  defaultChecked={editingItem.isAllDay}
                  className="w-5 h-5"
                />
                <Label htmlFor="edit-isAllDay" className="cursor-pointer">
                  {t("itinerary.allDayEvent")}
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startTime">{t("accommodations.checkIn")} *</Label>
                  <Input
                    id="edit-startTime"
                    name="startTime"
                    type="datetime-local"
                    defaultValue={new Date(editingItem.startTime).toISOString().slice(0, 16)}
                    min={tripStartDate || undefined}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endTime">{t("accommodations.checkOut")}</Label>
                  <Input
                    id="edit-endTime"
                    name="endTime"
                    type="datetime-local"
                    defaultValue={
                      editingItem.endTime
                        ? new Date(editingItem.endTime).toISOString().slice(0, 16)
                        : ""
                    }
                    min={tripStartDate || undefined}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-cost">{t("accommodations.cost")}</Label>
                <Input
                  id="edit-cost"
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingItem.cost ?? ""}
                  placeholder="0.00"
                />
              </div>

              {members.length > 0 && (
                <div>
                  <Label className="mb-2 block">{t("expenses.splitBetween")}</Label>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={editSplitMemberIds.includes(m.userId)}
                          onChange={(e) =>
                            setEditSplitMemberIds(e.target.checked
                              ? [...editSplitMemberIds, m.userId]
                              : editSplitMemberIds.filter((id) => id !== m.userId))
                          }
                        />
                        <span className="text-sm">{m.user.name || m.user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="edit-accommodation-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.saveChanges")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingItem(null); setError(""); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={t("accommodations.deleteTitle")}
          message={t("accommodations.deleteConfirm")}
          onConfirm={() => handleDeleteItem(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Detail View Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-white/20 p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs uppercase tracking-wider mb-3">
                  <Hotel className="w-4 h-4 shrink-0" /> {t("itinerary.categories.accommodation")}
                </div>
                <h2 className="text-2xl md:text-4xl font-black mb-2 tracking-tight">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-3xl leading-none hover:text-teal-400 transition-colors flex-shrink-0 ml-2"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("accommodations.checkIn")}</p>
                <p className="text-lg">
                  {formatDate(selectedItem.startTime, selectedItem.isAllDay)}
                </p>
              </div>

              {selectedItem.endTime && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t("accommodations.checkOut")}</p>
                  <p className="text-lg">
                    {formatDate(selectedItem.endTime, selectedItem.isAllDay)}
                  </p>
                </div>
              )}

              {selectedItem.location && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t("itinerary.location")}</p>
                  <a
                    href={getGoogleMapsUrl(selectedItem.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {selectedItem.location} ↗
                  </a>
                </div>
              )}

              {selectedItem.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t("itinerary.description")}</p>
                  <Linkify className="text-lg text-gray-300 whitespace-pre-wrap">{selectedItem.description}</Linkify>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">{t("common.addedBy")}</p>
                <p className="text-lg">{selectedItem.createdBy.name || selectedItem.createdBy.email}</p>
              </div>
            </div>

            {canModify(selectedItem.createdBy.id) && (
              <div className="flex gap-3">
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={() => {
                    setSelectedItem(null);
                    setEditingItem(selectedItem);
                    setEditLocation(selectedItem.location || "");
                    setEditSplitMemberIds(members.map((m) => m.userId));
                    setShowEditModal(true);
                  }}
                >
                  {t("common.edit")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
