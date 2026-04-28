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
import { parseGpx } from "@/lib/gpx-parser";
import { Linkify } from "@/components/ui/linkify";
import {
  Bike,
  Footprints,
  MapPin,
  Clock,
  Route,
  Mountain,
  FolderOpen,
  Home,
  Tent,
  Hotel,
  MoonStar,
  Pencil,
  Trash2,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";

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
  gpxPath: string | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

function getDifficultyColor(difficulty: string | null): string {
  switch (difficulty) {
    case "easy": return "bg-green-500/20 text-green-400 border-green-500/50";
    case "moderate": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "hard": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "expert": return "bg-red-500/20 text-red-400 border-red-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
}

function getAccommodationIcon(accommodation: string | null): LucideIcon | null {
  switch (accommodation) {
    case "hut": return Home;
    case "campsite": return Tent;
    case "hotel": return Hotel;
    case "bivouac": return MoonStar;
    default: return null;
  }
}

export default function StagesPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const tripId = params.tripId as string;

  const { toasts, toast, removeToast } = useToast();

  const [stages, setStages] = useState<Stage[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [tripType, setTripType] = useState<string | null>(null);
  const [tripStartDate, setTripStartDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpxLoading, setGpxLoading] = useState(false);
  const [selectedGpxFile, setSelectedGpxFile] = useState<File | null>(null);
  const [selectedGpxName, setSelectedGpxName] = useState<string>("");
  const [editGpxFile, setEditGpxFile] = useState<File | null>(null);
  const [editGpxName, setEditGpxName] = useState<string>("");
  const [openMenuStageId, setOpenMenuStageId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const editGpxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router, locale]);

  useEffect(() => {
    if (session && tripId) {
      fetchStages();
      localStorage.setItem(`seen_${tripId}_stage`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchStages() {
    try {
      const response = await fetch(`/api/trips/${tripId}/stages`);
      if (!response.ok) throw new Error("Failed to fetch stages");
      const data = await response.json();
      setStages(data.stages);
      if (data.userRole) setUserRole(data.userRole);
      if (data.tripType) setTripType(data.tripType);
      if (data.tripStartDate) setTripStartDate(new Date(data.tripStartDate).toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error fetching stages:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setGpxLoading(true);
    setSelectedGpxFile(file);
    setSelectedGpxName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseGpx(content);

        // Fill form fields
        const form = addFormRef.current;
        if (!form) return;

        if (result.name) {
          const titleInput = form.querySelector<HTMLInputElement>('[name="title"]');
          if (titleInput && !titleInput.value) titleInput.value = result.name;
        }
        if (result.distance) {
          const distInput = form.querySelector<HTMLInputElement>('[name="distance"]');
          if (distInput) distInput.value = String(result.distance);
        }
        if (result.elevationGain) {
          const gainInput = form.querySelector<HTMLInputElement>('[name="elevationGain"]');
          if (gainInput) gainInput.value = String(result.elevationGain);
        }
        if (result.elevationLoss) {
          const lossInput = form.querySelector<HTMLInputElement>('[name="elevationLoss"]');
          if (lossInput) lossInput.value = String(result.elevationLoss);
        }
        if (result.duration) {
          const durInput = form.querySelector<HTMLInputElement>('[name="duration"]');
          if (durInput) durInput.value = String(result.duration);
        }
        if (result.startLocation) {
          const startInput = form.querySelector<HTMLInputElement>('[name="startLocation"]');
          if (startInput && !startInput.value) startInput.value = result.startLocation;
        }
        if (result.endLocation) {
          const endInput = form.querySelector<HTMLInputElement>('[name="endLocation"]');
          if (endInput && !endInput.value) endInput.value = result.endLocation;
        }
      } catch (err) {
        setError(t("stages.gpxParseFailed"));
      } finally {
        setGpxLoading(false);
      }
    };
    reader.readAsText(file);
  }

  async function handleAddStage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);

    if (selectedGpxFile) {
      formData.set("gpxFile", selectedGpxFile);
    }

    // Remove empty values to avoid schema validation issues
    for (const [key, value] of Array.from(formData.entries())) {
      if (value === "") formData.delete(key);
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/stages`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create stage");
      }

      setShowAddModal(false);
      setSelectedGpxFile(null);
      setSelectedGpxName("");
      toast.success(t("stages.added"));
      fetchStages();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditStage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingStage) return;
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("id", editingStage.id);

    // Remove empty values
    for (const [key, value] of Array.from(formData.entries())) {
      if (value === "" && key !== "date") formData.delete(key);
    }

    if (editGpxFile) {
      formData.set("gpxFile", editGpxFile);
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/stages`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update stage");
      }

      setShowEditModal(false);
      setEditingStage(null);
      setEditGpxFile(null);
      setEditGpxName("");
      toast.success(t("stages.updated"));
      fetchStages();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStage(id: string) {
    try {
      const response = await fetch(`/api/trips/${tripId}/stages?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete stage");

      setShowDeleteConfirm(null);
      toast.success(t("stages.deleted"));
      fetchStages();
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast.error(t("stages.deleteFailed"));
    }
  }

  const canModify = (creatorId: string) =>
    userRole === "OWNER" || userRole === "ADMIN" || creatorId === session?.user?.id;

  // Summary calculations
  const totalDistance = stages.reduce((sum, s) => sum + (s.distance || 0), 0);
  const totalElevationGain = stages.reduce((sum, s) => sum + (s.elevationGain || 0), 0);
  const totalElevationLoss = stages.reduce((sum, s) => sum + (s.elevationLoss || 0), 0);
  const totalDuration = stages.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-2xl font-bold">{t("common.loading")}</div>
      </div>
    );
  }

  if (!session) return null;

  const difficulties = ["easy", "moderate", "hard", "expert"];
  const accommodations = ["hut", "campsite", "hotel", "bivouac", "none"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader backHref={`/trips/${tripId}`} />

      <TripNav tripId={tripId} currentSection="stages" />

      <PageTransition section="stages" tripId={tripId}>
      <main className="px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
                {tripType === "cycling" ? <Bike className="w-10 h-10 md:w-14 md:h-14 shrink-0" /> : <Footprints className="w-10 h-10 md:w-14 md:h-14 shrink-0" />}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("stages.title")}
                </span>
              </h1>
              <p className="text-lg text-gray-400">
                {stages.length} {t("stages.totalStages")}
              </p>
            </div>
            <Button onClick={() => { setError(""); setShowAddModal(true); }} variant="gradient" size="lg">
              {t("stages.addStage")}
            </Button>
          </div>

          {/* Summary Bar */}
          {stages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("stages.totalDistance")}</p>
                <p className="text-2xl font-black text-teal-400">{totalDistance.toFixed(1)} <span className="text-sm">{t("stages.km")}</span></p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("stages.totalElevation")}</p>
                <p className="text-2xl font-black text-green-400">↑{totalElevationGain} <span className="text-sm">{t("stages.m")}</span></p>
                <p className="text-sm text-red-400">↓{totalElevationLoss} {t("stages.m")}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("stages.totalDuration")}</p>
                <p className="text-2xl font-black text-amber-400">{totalDuration.toFixed(1)} <span className="text-sm">{t("stages.h")}</span></p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t("stages.totalStages")}</p>
                <p className="text-2xl font-black text-white">{stages.length}</p>
              </Card>
            </div>
          )}

          {/* Stage List */}
          {stages.length === 0 ? (
            <Card className="p-16 text-center">
              <Mountain className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
              <h2 className="text-3xl font-bold mb-4 tracking-tight">{t("stages.noStages")}</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">{t("stages.noStagesSubtitle")}</p>
              <Button onClick={() => { setError(""); setShowAddModal(true); }} variant="gradient" size="lg">
                {t("stages.addFirstStage")}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {stages.map((stage) => {
              const AccommodationIcon = getAccommodationIcon(stage.accommodation);
              return (
                <Card key={stage.id} className="p-0 overflow-hidden">
                  <div className="flex">
                    {/* Day number sidebar */}
                    <div className="w-16 md:w-20 bg-gradient-to-b from-teal-500/20 to-emerald-500/20 border-r border-white/10 flex flex-col items-center justify-center flex-shrink-0 py-2">
                      <span className="text-xs text-gray-500 uppercase">{t("stages.day")}</span>
                      <span className="text-2xl md:text-3xl font-black text-teal-400">{stage.order}</span>
                      {stage.date && (
                        <span className="text-[10px] text-gray-500 mt-1">
                          {new Date(stage.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Stage content */}
                    <div className="flex-1 p-4 md:p-6">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-2">
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight">{stage.title}</h3>
                        <div className="flex gap-2 flex-shrink-0">
                          {stage.difficulty && (
                            <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${getDifficultyColor(stage.difficulty)}`}>
                              {t(`stages.difficulties.${stage.difficulty}`)}
                            </span>
                          )}
                          {stage.accommodation && stage.accommodation !== "none" && (
                            <span className="px-2 py-0.5 text-xs bg-white/10 border border-white/20 flex items-center gap-1">
                              {AccommodationIcon && <AccommodationIcon className="w-4 h-4 shrink-0" />}
                              {t(`stages.accommodations.${stage.accommodation}`)}
                            </span>
                          )}
                        </div>
                        </div>
                        {canModify(stage.createdBy.id) && (
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setOpenMenuStageId(openMenuStageId === stage.id ? null : stage.id)}
                              className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                            ><MoreVertical className="w-4 h-4" /></button>
                            {openMenuStageId === stage.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuStageId(null)} />
                                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
                                  <button
                                    onClick={() => { setEditingStage(stage); setEditGpxFile(null); setEditGpxName(""); setError(""); setShowEditModal(true); setOpenMenuStageId(null); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                  >
                                    <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
                                  </button>
                                  <button
                                    onClick={() => { setShowDeleteConfirm(stage.id); setOpenMenuStageId(null); }}
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
                      {(stage.startLocation || stage.endLocation) && (
                        <p className="text-gray-400 mb-2 flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 shrink-0" /> {stage.startLocation || "?"} → {stage.endLocation || "?"}
                        </p>
                      )}

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {stage.distance != null && (
                          <span className="text-teal-400 font-semibold flex items-center gap-1">
                            <Route className="w-4 h-4 shrink-0" /> {stage.distance} {t("stages.km")}
                          </span>
                        )}
                        {stage.elevationGain != null && (
                          <span className="text-green-400 font-semibold">
                            ↑ {stage.elevationGain} {t("stages.m")}
                          </span>
                        )}
                        {stage.elevationLoss != null && (
                          <span className="text-red-400 font-semibold">
                            ↓ {stage.elevationLoss} {t("stages.m")}
                          </span>
                        )}
                        {stage.duration != null && (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Clock className="w-4 h-4 shrink-0" /> {stage.duration} {t("stages.h")}
                          </span>
                        )}
                      </div>

                      {stage.description && (
                        <div className="text-gray-500 mt-3 text-sm"><Linkify>{stage.description}</Linkify></div>
                      )}

                      {/* Actions */}
                      {stage.gpxPath && (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-white/10 flex-wrap items-center">
                          <a
                            href={`/api/trips/${tripId}/stages/${stage.id}/gpx`}
                            download
                            className="text-xs text-teal-500 hover:text-teal-400 transition-colors uppercase tracking-wider font-bold"
                          >
                            ↓ GPX
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            </div>
          )}
        </div>
      </main>

      </PageTransition>

      {/* Add Stage Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setSelectedGpxFile(null); setSelectedGpxName(""); }}>
        <Modal.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tight">{t("stages.addStageModal")}</h2>
            <button onClick={() => { setShowAddModal(false); setSelectedGpxFile(null); setSelectedGpxName(""); }} className="text-gray-500 hover:text-white text-2xl">✕</button>
          </div>
        </Modal.Header>
        <Modal.Body>
            <form id="add-stage-form" ref={addFormRef} onSubmit={handleAddStage} className="space-y-4">
              {/* GPX Upload */}
              <div
                className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${selectedGpxFile ? "border-teal-500/70 bg-teal-500/5" : "border-white/20 hover:border-teal-500/50"}`}
                onClick={() => gpxInputRef.current?.click()}
              >
                <input
                  ref={gpxInputRef}
                  type="file"
                  accept=".gpx"
                  onChange={handleGpxUpload}
                  className="hidden"
                />
                <p className="text-sm text-gray-400">
                  {gpxLoading ? (
                    <span className="text-teal-400">{t("common.loading")}</span>
                  ) : selectedGpxFile ? (
                    <span className="text-teal-400 flex items-center justify-center gap-1"><FolderOpen className="w-4 h-4 shrink-0" /> {selectedGpxName}</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1"><FolderOpen className="w-4 h-4 shrink-0" /> {t("stages.importGpx")}</span>
                  )}
                </p>
                <p className="text-xs text-gray-600 mt-1">{t("stages.gpxHint")}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>
              )}

              <div>
                <Label htmlFor="title">{t("stages.stageTitle")} *</Label>
                <Input id="title" name="title" placeholder="Hut A → Hut B" required />
              </div>

              <div>
                <Label htmlFor="date">{t("stages.date")}</Label>
                <Input id="date" name="date" type="date" min={tripStartDate || undefined} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startLocation">{t("stages.startLocation")}</Label>
                  <Input id="startLocation" name="startLocation" placeholder="Start" />
                </div>
                <div>
                  <Label htmlFor="endLocation">{t("stages.endLocation")}</Label>
            <Input id="endLocation" name="endLocation" placeholder="End" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="distance">{t("stages.distance")}</Label>
                  <Input id="distance" name="distance" type="number" step="0.1" min="0" placeholder="15.5" />
                </div>
                <div>
                  <Label htmlFor="duration">{t("stages.duration")}</Label>
                  <Input id="duration" name="duration" type="number" step="0.1" min="0" placeholder="6" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="elevationGain">{t("stages.elevationGain")}</Label>
                  <Input id="elevationGain" name="elevationGain" type="number" min="0" placeholder="800" />
                </div>
                <div>
                  <Label htmlFor="elevationLoss">{t("stages.elevationLoss")}</Label>
                  <Input id="elevationLoss" name="elevationLoss" type="number" min="0" placeholder="500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">{t("stages.difficulty")}</Label>
                  <Select
                    id="difficulty"
                    name="difficulty"
                  >
                    <option value="">{t("common.select")}</option>
                    {difficulties.map((d) => (
                      <option key={d} value={d}>{t(`stages.difficulties.${d}`)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="accommodation">{t("stages.accommodation")}</Label>
                  <Select
                    id="accommodation"
                    name="accommodation"
                  >
                    <option value="">{t("common.select")}</option>
                    {accommodations.map((a) => (
                      <option key={a} value={a}>{t(`stages.accommodations.${a}`)}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">{t("stages.description")}</Label>
                <Input id="description" name="description" placeholder="Notes about this stage..." />
              </div>

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="add-stage-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("stages.addStage")}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); setSelectedGpxFile(null); setSelectedGpxName(""); }}>
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Stage Modal */}
      {editingStage && <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingStage(null); }}>
        <Modal.Header>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black tracking-tight">{t("stages.editStage")}</h2>
            <button onClick={() => { setShowEditModal(false); setEditingStage(null); }} className="text-gray-500 hover:text-white text-2xl">✕</button>
          </div>
        </Modal.Header>
        <Modal.Body>
            <form id="edit-stage-form" onSubmit={handleEditStage} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>
              )}

              <div>
                <Label htmlFor="editTitle">{t("stages.stageTitle")} *</Label>
                <Input id="editTitle" name="title" defaultValue={editingStage.title} required />
              </div>

              <div>
                <Label htmlFor="editDate">{t("stages.date")}</Label>
                <Input id="editDate" name="date" type="date" defaultValue={editingStage.date ? new Date(editingStage.date).toISOString().split("T")[0] : ""} min={tripStartDate || undefined} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartLocation">{t("stages.startLocation")}</Label>
                  <Input id="editStartLocation" name="startLocation" defaultValue={editingStage.startLocation || ""} />
                </div>
                <div>
                  <Label htmlFor="editEndLocation">{t("stages.endLocation")}</Label>
                  <Input id="editEndLocation" name="endLocation" defaultValue={editingStage.endLocation || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDistance">{t("stages.distance")}</Label>
                  <Input id="editDistance" name="distance" type="number" step="0.1" min="0" defaultValue={editingStage.distance || ""} />
                </div>
                <div>
                  <Label htmlFor="editDuration">{t("stages.duration")}</Label>
                  <Input id="editDuration" name="duration" type="number" step="0.5" min="0" defaultValue={editingStage.duration || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editElevationGain">{t("stages.elevationGain")}</Label>
                  <Input id="editElevationGain" name="elevationGain" type="number" min="0" defaultValue={editingStage.elevationGain || ""} />
                </div>
                <div>
                  <Label htmlFor="editElevationLoss">{t("stages.elevationLoss")}</Label>
                  <Input id="editElevationLoss" name="elevationLoss" type="number" min="0" defaultValue={editingStage.elevationLoss || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDifficulty">{t("stages.difficulty")}</Label>
                  <Select
                    id="editDifficulty"
                    name="difficulty"
                    defaultValue={editingStage.difficulty || ""}
                  >
                    <option value="">{t("common.select")}</option>
                    {difficulties.map((d) => (
                      <option key={d} value={d}>{t(`stages.difficulties.${d}`)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editAccommodation">{t("stages.accommodation")}</Label>
                  <Select
                    id="editAccommodation"
                    name="accommodation"
                    defaultValue={editingStage.accommodation || ""}
                  >
                    <option value="">{t("common.select")}</option>
                    {accommodations.map((a) => (
                      <option key={a} value={a}>{t(`stages.accommodations.${a}`)}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription">{t("stages.description")}</Label>
                <Input id="editDescription" name="description" defaultValue={editingStage.description || ""} />
              </div>

              {/* GPX Upload */}
              <div>
                <Label>GPX</Label>
                <input
                  ref={editGpxInputRef}
                  type="file"
                  accept=".gpx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setEditGpxFile(file); setEditGpxName(file.name); }
                    e.target.value = "";
                  }}
                />
                <div
                  className={`border-2 border-dashed p-3 text-center cursor-pointer transition-colors ${editGpxFile ? "border-teal-500/70 bg-teal-500/5" : "border-white/20 hover:border-teal-500/50"}`}
                  onClick={() => editGpxInputRef.current?.click()}
                >
                  <p className="text-sm text-gray-400">
                    {editGpxFile ? (
                      <span className="text-teal-400 flex items-center justify-center gap-1"><FolderOpen className="w-4 h-4 shrink-0" /> {editGpxName}</span>
                    ) : editingStage.gpxPath ? (
                      <span className="flex items-center justify-center gap-1"><FolderOpen className="w-4 h-4 shrink-0" /> {editingStage.gpxPath} — <span className="text-teal-400">{t("stages.clickToReplace")}</span></span>
                    ) : (
                      <span className="flex items-center justify-center gap-1"><FolderOpen className="w-4 h-4 shrink-0" /> {t("stages.importGpx")}</span>
                    )}
                  </p>
                </div>
              </div>

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="edit-stage-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.saveChanges")}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowEditModal(false); setEditingStage(null); }}>
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={t("stages.deleteStage")}
          message={t("stages.deleteConfirm")}
          onConfirm={() => handleDeleteStage(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
