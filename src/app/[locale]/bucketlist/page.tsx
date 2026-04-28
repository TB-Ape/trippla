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
import { ToastContainer } from "@/components/ui/toast";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/useToast";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { AppNav } from "@/components/AppNav";
import { Sparkles, MapPin, Trash2, MoreVertical } from "lucide-react";

interface BucketListItem {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  type: string | null;
}

export default function BucketListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const { toasts, toast, removeToast } = useToast();

  const [items, setItems] = useState<BucketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");

  const [deleteItem, setDeleteItem] = useState<BucketListItem | null>(null);

  const [planItem, setPlanItem] = useState<BucketListItem | null>(null);
  const [planStartDate, setPlanStartDate] = useState("");
  const [planEndDate, setPlanEndDate] = useState("");
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false);
  const [planError, setPlanError] = useState("");

  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale]);

  useEffect(() => {
    if (session) {
      fetchItems();
    }
  }, [session]);

  async function fetchItems() {
    try {
      const response = await fetch("/api/bucketlist");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setItems(data.items);
    } catch (err) {
      console.error("Error fetching bucket list:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      destination: destination || undefined,
      type: tripType || undefined,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bucketlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create");
      }
      setShowAddModal(false);
      setDestination("");
      setTripType("");
      toast.success(t("bucketList.created"));
      fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      const response = await fetch(`/api/trips/${deleteItem.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      setDeleteItem(null);
      toast.success(t("bucketList.deleted"));
      fetchItems();
    } catch {
      toast.error(t("bucketList.deleteFailed"));
      setDeleteItem(null);
    }
  }

  async function handlePlanTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!planItem) return;
    setPlanError("");

    if (planEndDate && new Date(planEndDate) < new Date(planStartDate)) {
      setPlanError(t("trips.endBeforeStart"));
      return;
    }

    setIsPlanSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${planItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBucketList: false,
          startDate: planStartDate,
          endDate: planEndDate || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to plan trip");
      }
      toast.success(t("bucketList.planned"));
      router.push(`/${locale}/trips/${planItem.id}`);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPlanSubmitting(false);
    }
  }

  if (status === "loading" || isLoading) {
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

      <AppNav current="bucketlist" />

      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
                <Sparkles className="w-8 h-8 shrink-0" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("bucketList.title")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400">
                {items.length} {items.length === 1 ? t("trips.trip") : t("trips.trips")}
              </p>
            </div>
            <Button onClick={() => { setShowAddModal(true); setError(""); setDestination(""); setTripType(""); }} variant="gradient" size="lg">
              {t("bucketList.addItem")}
            </Button>
          </div>
        </div>
      </div>
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">

          {items.length === 0 ? (
            <div className="bg-white/5 border border-white/10 p-16 text-center">
              <Sparkles className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
              <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("bucketList.noItems")}</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                {t("bucketList.noItemsSubtitle")}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="p-6 flex flex-col">
                  <div className="mb-4 flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <h3 className="text-2xl font-bold">{item.name}</h3>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {item.type && (
                            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50">
                              {t(`trips.types.${item.type}`)}
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-400/10 text-teal-300 border border-teal-400/30 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 shrink-0" /> {t("bucketList.badge")}
                          </span>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                          className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                        ><MoreVertical className="w-4 h-4" /></button>
                        {openMenuItemId === item.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
                              <button
                                onClick={() => { setDeleteItem(item); setOpenMenuItemId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {item.destination && (
                      <p className="text-gray-400 flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 shrink-0" /> {item.destination}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-gray-400 text-sm line-clamp-2 mt-2">{item.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setPlanItem(item);
                        setPlanStartDate("");
                        setPlanEndDate("");
                        setPlanError("");
                      }}
                    >
                      {t("bucketList.planThisTrip")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Add Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3"><Sparkles className="w-8 h-8 shrink-0" /> <span className="text-teal-400">{t("bucketList.addModal")}</span></h2>
        </Modal.Header>
        <Modal.Body>
          <form id="add-bucket-form" onSubmit={handleAddItem} className="space-y-4">
            {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>}
            <div>
              <Label htmlFor="name">{t("bucketList.name")} *</Label>
              <Input id="name" name="name" placeholder={t("bucketList.namePlaceholder")} required />
            </div>
            <div>
              <Label htmlFor="destination">{t("trips.destination")}</Label>
              <LocationAutocomplete id="destination" name="destination" value={destination} onChange={setDestination} placeholder={t("trips.searchDestination")} />
            </div>
            <div>
              <Label htmlFor="description">{t("trips.description")}</Label>
              <Input id="description" name="description" placeholder={t("trips.descriptionPlaceholder")} />
            </div>
            <div>
              <Label htmlFor="tripType">{t("trips.tripType")}</Label>
              <Select id="tripType" value={tripType} onChange={(e) => setTripType(e.target.value)}>
                <option value="">{t("trips.selectType")}</option>
                {["city", "beach", "camping", "hiking", "cycling", "roadtrip", "ski", "cruise"].map((type) => (
                  <option key={type} value={type}>{t(`trips.types.${type}`)}</option>
                ))}
              </Select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="add-bucket-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.creating") : t("common.create")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Plan This Trip Modal */}
      <Modal open={!!planItem} onClose={() => setPlanItem(null)}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3"><Sparkles className="w-8 h-8 shrink-0" /> <span className="text-teal-400">{t("bucketList.planModal")}</span></h2>
          <p className="text-gray-400">{planItem?.name}</p>
        </Modal.Header>
        <Modal.Body>
          <form id="plan-trip-form" onSubmit={handlePlanTrip} className="space-y-4">
            {planError && <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{planError}</div>}
            <div>
              <Label htmlFor="planStartDate">{t("bucketList.startDate")} *</Label>
              <Input id="planStartDate" type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="planEndDate">{t("bucketList.endDate")}</Label>
              <Input id="planEndDate" type="date" value={planEndDate} onChange={(e) => setPlanEndDate(e.target.value)} />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="plan-trip-form" variant="gradient" className="flex-1" loading={isPlanSubmitting}>
            {isPlanSubmitting ? t("common.creating") : t("bucketList.planThisTrip")}
          </Button>
          <Button type="button" variant="outline" onClick={() => setPlanItem(null)} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      {deleteItem && (
        <ConfirmDeleteModal
          title={t("bucketList.deleteTitle")}
          message={t("bucketList.deleteConfirm", { name: deleteItem.name })}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
