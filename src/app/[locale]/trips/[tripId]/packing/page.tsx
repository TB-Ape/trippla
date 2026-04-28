"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TripNav } from "@/components/TripNav";
import { AppHeader } from "@/components/AppHeader";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PageTransition } from "@/components/PageTransition";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import type { LucideIcon } from "lucide-react";
import { Lock, Pencil, Backpack, Share2, Copy, Check, ExternalLink, MoreVertical, Package } from "lucide-react";
import { CATEGORY_ICON } from "@/lib/packingCategories";
import { PACKING_ICON_MAP } from "@/lib/packingIcons";
import { PackingFastEditor } from "@/components/PackingFastEditor";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface PackingItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  categoryEmoji: string | null;
  isPacked: boolean;
  claimedBy: User | null;
}

interface PackingList {
  id: string;
  name: string;
  isPrivate: boolean;
  isTemplate: boolean;
  templateDescription: string | null;
  shareCode: string;
  createdBy: User;
  items: PackingItem[];
}

interface PackingPreviewItem {
  id: string;
  name: string;
  quantity: number;
  category: string | null;
  categoryEmoji: string | null;
}

interface PackingPreviewTemplate {
  id: string;
  name: string;
  shareCode: string;
  templateDescription: string | null;
  items: PackingPreviewItem[];
  createdBy: { name: string | null; email: string };
}

export default function PackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const tripId = params.tripId as string;

  const BASE_CATEGORIES = ["clothing", "toiletries", "electronics", "documents"];

  const EXTRA_CATEGORIES: Record<string, string[]> = {
    city: [],
    beach: ["beach", "watersports"],
    camping: ["shelter", "cooking", "tools", "lighting"],
    hiking: ["gear", "safety", "shelter", "cooking", "lighting"],
    cycling: ["gear", "safety", "shelter", "cooking", "lighting"],
    roadtrip: ["car", "snacks"],
    ski: ["skigear", "safety"],
    cruise: ["formal", "beach"],
  };

  const { toasts, toast, removeToast } = useToast();

  const [tripType, setTripType] = useState<string | null>(null);
  const [lists, setLists] = useState<PackingList[]>([]);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customEmoji, setCustomEmoji] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: "list" | "item"; id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuListId, setOpenMenuListId] = useState<string | null>(null);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);

  // Publish template state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishListId, setPublishListId] = useState<string | null>(null);
  const [publishDescription, setPublishDescription] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New list modal tab state
  const [newListTab, setNewListTab] = useState<"create" | "import">("create");
  const [importCode, setImportCode] = useState("");
  const [importPreview, setImportPreview] = useState<PackingPreviewTemplate | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [importPreviewError, setImportPreviewError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
    }
  }, [status, router]);

  useEffect(() => {
    if (session && tripId) {
      fetchLists();
      fetchTripType();
      localStorage.setItem(`seen_${tripId}_packing`, new Date().toISOString());
    }
  }, [session, tripId]);

  async function fetchTripType() {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (response.ok) {
        const data = await response.json();
        setTripType(data.trip.type || null);
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
    }
  }

  const predefinedKeys = [
    ...BASE_CATEGORIES,
    ...(tripType && EXTRA_CATEGORIES[tripType] ? EXTRA_CATEGORIES[tripType] : []),
    "other",
  ];
  const uniquePredefinedKeys = [...new Set(predefinedKeys)];

  const allKnownKeys = new Set(Object.keys(CATEGORY_ICON));
  const customCategoryMap = new Map<string, string>();
  lists.forEach((list) => {
    list.items.forEach((item) => {
      if (item.category && !allKnownKeys.has(item.category) && !customCategoryMap.has(item.category)) {
        customCategoryMap.set(item.category, item.categoryEmoji || "");
      }
    });
  });

  const CATEGORIES = [
    ...uniquePredefinedKeys.map((key) => ({
      value: key,
      label: t(`packing.categories.${key}`),
    })),
    ...[...customCategoryMap.entries()].map(([key]) => ({
      value: key,
      label: key,
    })),
  ];

  async function fetchLists() {
    try {
      const response = await fetch(`/api/trips/${tripId}/packing`);
      if (!response.ok) {
        throw new Error("Failed to fetch packing lists");
      }
      const data = await response.json();
      setLists(data.lists);
      if (data.userRole) setUserRole(data.userRole);
    } catch (error) {
      console.error("Error fetching packing lists:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateList(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isPrivate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create list");
      }

      setShowCreateListModal(false);
      setNewListTab("create");
      setImportCode("");
      setImportPreview(null);
      setImportPreviewError("");
      setIsPrivate(false);
      toast.success(t("packing.listCreated"));
      fetchLists();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!selectedListId) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const category = useCustomCategory ? customCategory.trim() : (formData.get("category") as string);

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/packing/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: selectedListId,
          name,
          quantity,
          category: category || undefined,
          categoryEmoji: useCustomCategory && customEmoji ? customEmoji : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add item");
      }

      setShowAddItemModal(false);
      setSelectedListId(null);
      setCustomCategory("");
      setCustomEmoji("");
      setUseCustomCategory(false);
      toast.success(t("packing.itemAdded"));
      fetchLists();
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
    const name = formData.get("name") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const category = useCustomCategory ? customCategory.trim() : (formData.get("category") as string);

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/packing/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem.id, name, quantity, category: category || undefined }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }

      setShowEditItemModal(false);
      setEditingItem(null);
      setCustomCategory("");
      setUseCustomCategory(false);
      toast.success(t("packing.itemUpdated"));
      fetchLists();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTogglePacked(itemId: string, isPacked: boolean) {
    try {
      const response = await fetch(`/api/trips/${tripId}/packing/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, isPacked: !isPacked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      fetchLists();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  }

  async function handleToggleClaim(itemId: string, currentClaimId: string | null) {
    if (!session) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/packing/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          claimedById: currentClaimId === session.user.id ? null : session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update claim");
      }

      fetchLists();
    } catch (error) {
      console.error("Error updating claim:", error);
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      const response = await fetch(`/api/trips/${tripId}/packing?id=${listId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete list");
      }

      setShowDeleteConfirm(null);
      toast.success(t("packing.listDeleted"));
      fetchLists();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error(t("packing.listDeleteFailed"));
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const response = await fetch(
        `/api/trips/${tripId}/packing/items?id=${itemId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setShowDeleteConfirm(null);
      toast.success(t("packing.itemDeleted"));
      fetchLists();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(t("packing.itemDeleteFailed"));
    }
  }

  async function handleConfirmDelete() {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm.type === "list") {
      await handleDeleteList(showDeleteConfirm.id);
    } else {
      await handleDeleteItem(showDeleteConfirm.id);
    }
  }

  async function handleAddToMyItems() {
    const existingPrivate = lists.find(
      (l) => l.isPrivate && l.createdBy.id === session!.user.id
    );
    if (existingPrivate) {
      setSelectedListId(existingPrivate.id);
      setShowAddItemModal(true);
      return;
    }
    try {
      const res = await fetch(`/api/trips/${tripId}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t("packing.myItems"), isPrivate: true }),
      });
      if (!res.ok) throw new Error("Failed to create list");
      const data = await res.json();
      await fetchLists();
      setSelectedListId(data.list.id);
      setShowAddItemModal(true);
    } catch {
      toast.error(t("packing.listCreateFailed"));
    }
  }

  async function handlePublish() {
    if (!publishListId) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/packing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: publishListId,
          isTemplate: true,
          templateDescription: publishDescription || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      setShowPublishModal(false);
      setPublishDescription("");
      setPublishListId(null);
      toast.success(t("packing.published"));
      fetchLists();
    } catch {
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish(listId: string) {
    try {
      const res = await fetch(`/api/trips/${tripId}/packing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listId, isTemplate: false }),
      });
      if (!res.ok) throw new Error("Failed to unpublish");
      toast.success(t("packing.unpublished"));
      fetchLists();
    } catch {
      toast.error("Failed to unpublish");
    }
  }

  function handleCopyCode(shareCode: string) {
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopiedCode(shareCode);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  async function handleImportPreview() {
    if (!importCode.trim()) return;
    setImportPreviewLoading(true);
    setImportPreview(null);
    setImportPreviewError("");
    try {
      const res = await fetch(`/api/packing-templates/${importCode.trim()}`);
      if (!res.ok) {
        setImportPreviewError(t("packing.importError"));
        return;
      }
      const data = await res.json();
      setImportPreview(data.template);
    } catch {
      setImportPreviewError(t("packing.importError"));
    } finally {
      setImportPreviewLoading(false);
    }
  }

  async function handleImportConfirm() {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      const res = await fetch(`/api/packing-templates/${importPreview.shareCode}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      if (!res.ok) throw new Error("Failed to import");
      setShowCreateListModal(false);
      setNewListTab("create");
      setImportCode("");
      setImportPreview(null);
      setImportPreviewError("");
      toast.success(t("packing.importSuccess"));
      fetchLists();
    } catch {
      toast.error("Failed to import template");
    } finally {
      setIsImporting(false);
    }
  }

  function getCategoryIcon(category: string): LucideIcon {
    if (CATEGORY_ICON[category]) return CATEGORY_ICON[category];
    const customIconName = customCategoryMap.get(category);
    if (customIconName && PACKING_ICON_MAP[customIconName]) return PACKING_ICON_MAP[customIconName];
    return Package;
  }

  function getListStats(list: PackingList) {
    const totalItems = list.items.length;
    const packedItems = list.items.filter((item) => item.isPacked).length;
    const claimedItems = list.items.filter((item) => item.claimedBy).length;
    return { totalItems, packedItems, claimedItems };
  }

  function groupItemsByCategory(items: PackingItem[]): [string, PackingItem[]][] {
    const grouped = new Map<string, PackingItem[]>();
    for (const item of items) {
      const key = item.category || "other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }
    // Sort items within each group alphabetically
    for (const [, group] of grouped) {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Sort groups by display label (known categories translated, custom use raw string)
    return [...grouped.entries()].sort(([a], [b]) => {
      const labelA = allKnownKeys.has(a) ? t(`packing.categories.${a}`) : a;
      const labelB = allKnownKeys.has(b) ? t(`packing.categories.${b}`) : b;
      return labelA.localeCompare(labelB);
    });
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
      <AppHeader backHref={`/trips/${tripId}`} />

      <TripNav tripId={tripId} currentSection="packing" />

      <PageTransition section="packing" tripId={tripId}>
      {/* Page Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                  {t("packing.title")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400">
                {lists.filter((l) => !(l.isPrivate && l.createdBy.id === session.user.id)).length} {lists.filter((l) => !(l.isPrivate && l.createdBy.id === session.user.id)).length === 1 ? t("common.list") : t("common.lists")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Button
                onClick={() => setShowCreateListModal(true)}
                variant="gradient"
                size="lg"
              >
                + {t("packing.newList")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* My Items Section */}
          {(() => {
            const myItems = lists.flatMap((list) =>
              list.items
                .filter(
                  (item) =>
                    item.claimedBy?.id === session.user.id || list.isPrivate
                )
                .map((item) => ({ ...item, listName: list.name, listIsPrivate: list.isPrivate }))
            );
            return (
              <Card className="p-6 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
                      {t("packing.myItems")}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">{t("packing.myItemsSubtitle")}</p>
                    <div className="mt-3 h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all"
                        style={{ width: `${myItems.length > 0 ? (myItems.filter(i => i.isPacked).length / myItems.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddToMyItems} variant="outline" size="sm" className="flex-shrink-0">
                    + {t("packing.addItem")}
                  </Button>
                </div>
                {myItems.length === 0 ? (
                  <p className="text-gray-600 text-sm py-4 text-center">{t("packing.noPersonalItems")}</p>
                ) : (
                  <div className="space-y-2">
                    {myItems.map((item) => {
                      const CategoryIcon = getCategoryIcon(item.category);
                      return (
                      <div
                        key={item.id}
                        className="p-3 border border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 md:gap-4">
                          <input
                            type="checkbox"
                            checked={item.isPacked}
                            onChange={() => handleTogglePacked(item.id, item.isPacked)}
                            className="w-5 h-5 md:w-6 md:h-6 cursor-pointer flex-shrink-0"
                          />
                          {item.categoryEmoji && PACKING_ICON_MAP[item.categoryEmoji] ? (
                            (() => { const EI = PACKING_ICON_MAP[item.categoryEmoji!]; return <EI className="w-6 h-6 shrink-0" />; })()
                          ) : item.categoryEmoji ? (
                            <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
                          ) : (
                            <CategoryIcon className="w-6 h-6 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold ${item.isPacked ? "line-through text-gray-500" : ""}`}>
                              {item.name}
                              {item.quantity > 1 && (
                                <span className="text-gray-500 ml-2">×{item.quantity}</span>
                              )}
                            </p>
                            <span className="text-xs text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm">
                              {item.listName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!item.listIsPrivate && (
                              <button
                                onClick={() => handleToggleClaim(item.id, item.claimedBy?.id || null)}
                                className="px-2 md:px-3 py-1 text-xs border bg-teal-500/20 border-teal-500 text-teal-400 hover:bg-teal-500/30 transition-colors"
                              >
                                {t("packing.unclaim")}
                              </button>
                            )}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                                className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white text-sm"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuItemId === item.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
                                  <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[140px]">
                                    <button
                                      onClick={() => {
                                        setOpenMenuItemId(null);
                                        setEditingItem(item);
                                        setUseCustomCategory(!allKnownKeys.has(item.category));
                                        setCustomCategory(!allKnownKeys.has(item.category) ? item.category : "");
                                        setShowEditItemModal(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                                      {t("common.edit")}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenMenuItemId(null);
                                        setShowDeleteConfirm({ type: "item", id: item.id });
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      {t("common.delete")}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </Card>
            );
          })()}

          {(() => {
            const sharedLists = lists.filter((l) => !(l.isPrivate && l.createdBy.id === session.user.id));
            if (sharedLists.length === 0) return (
              <div className="bg-white/5 border border-white/10 p-8 md:p-16 text-center">
                <Backpack className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
                <h2 className="text-3xl font-bold mb-4 tracking-tight">
                  {t("packing.noLists")}
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  {t("packing.noListsSubtitle")}
                </p>
                <Button onClick={() => setShowCreateListModal(true)} variant="gradient">
                  {t("packing.createFirstList")}
                </Button>
              </div>
            );
            return (
            <div className="space-y-8">
              {sharedLists.map((list) => {
                const stats = getListStats(list);
                return (
                  <Card key={list.id} className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl md:text-3xl font-black mb-2 flex flex-wrap items-center gap-2">
                          {list.name}
                          {list.isPrivate && (
                            <span title={t("packing.privateList")}><Lock className="w-4 h-4 text-yellow-400 shrink-0" /></span>
                          )}
                          {list.isTemplate && (
                            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/50 flex items-center gap-1">
                              <Share2 className="w-3 h-3" />
                              {t("templates.templateBadge")}
                            </span>
                          )}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500">
                          {t("common.createdBy")} {list.createdBy.name || list.createdBy.email} ·{" "}
                          {stats.packedItems}/{stats.totalItems} {t("packing.packed")} ·{" "}
                          {stats.claimedItems}/{stats.totalItems} {t("packing.claimed")}
                        </p>
                        <div className="mt-3 h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all"
                            style={{ width: `${stats.totalItems > 0 ? (stats.packedItems / stats.totalItems) * 100 : 0}%` }}
                          />
                        </div>
                        {/* Share code badge */}
                        {list.isTemplate && list.createdBy.id === session.user.id && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">{t("packing.shareCode")}:</span>
                            <code className="text-xs font-mono bg-white/5 border border-white/10 px-2 py-0.5 text-teal-400">
                              {list.shareCode}
                            </code>
                            <button
                              onClick={() => handleCopyCode(list.shareCode)}
                              className="text-xs text-gray-400 hover:text-teal-400 transition-colors flex items-center gap-1"
                              title={t("packing.copyCode")}
                            >
                              {copiedCode === list.shareCode ? (
                                <><Check className="w-3.5 h-3.5" /> {t("packing.codeCopied")}</>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /> {t("packing.copyCode")}</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center flex-wrap justify-end">
                        {canModify(list.createdBy.id) && editingListId !== list.id && (
                          <button
                            title={t("packing.editAsText")}
                            onClick={() => setEditingListId(list.id)}
                            className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {editingListId !== list.id && (
                          <Button
                            onClick={() => {
                              setSelectedListId(list.id);
                              setShowAddItemModal(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            + {t("packing.addItem")}
                          </Button>
                        )}
                        {canModify(list.createdBy.id) && editingListId !== list.id && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuListId(openMenuListId === list.id ? null : list.id)}
                              className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuListId === list.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuListId(null)} />
                                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[180px]">
                                  {list.createdBy.id === session.user.id && (
                                    <>
                                      {list.isTemplate ? (
                                        <button
                                          onClick={() => {
                                            setOpenMenuListId(null);
                                            handleUnpublish(list.id);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                        >
                                          <Share2 className="w-3.5 h-3.5 shrink-0" />
                                          {t("packing.unpublish")}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setOpenMenuListId(null);
                                            setPublishListId(list.id);
                                            setPublishDescription("");
                                            setShowPublishModal(true);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                        >
                                          <Share2 className="w-3.5 h-3.5 shrink-0" />
                                          {t("packing.publishAsTemplate")}
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setOpenMenuListId(null);
                                      setShowDeleteConfirm({ type: "list", id: list.id });
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    {t("packing.deleteList")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {editingListId === list.id ? (
                      <PackingFastEditor
                        list={list}
                        tripId={tripId}
                        onSave={() => {
                          setEditingListId(null);
                          fetchLists();
                        }}
                        onCancel={() => setEditingListId(null)}
                        onError={(msg) => toast.error(msg)}
                      />
                    ) : list.items.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        {t("packing.noItemsYet")}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {groupItemsByCategory(list.items).map(([category, items]) => {
                          const CategoryIcon = getCategoryIcon(category);
                          const categoryLabel = allKnownKeys.has(category)
                            ? t(`packing.categories.${category}`)
                            : category;
                          return (
                            <div key={category}>
                              <div className="flex items-center gap-2 mb-2 px-1">
                                <CategoryIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                  {categoryLabel}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {items.map((item) => {
                                  const ItemIcon = getCategoryIcon(item.category);
                                  return (
                                  <div
                                    key={item.id}
                                    className={`p-3 border hover:bg-white/5 transition-colors space-y-2 ${
                                      item.claimedBy?.id === session.user.id
                                        ? "border-teal-500/20 opacity-50"
                                        : "border-white/10"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 md:gap-4">
                                      <input
                                        type="checkbox"
                                        checked={item.isPacked}
                                        onChange={() => handleTogglePacked(item.id, item.isPacked)}
                                        className="w-5 h-5 md:w-6 md:h-6 cursor-pointer flex-shrink-0"
                                      />
                                      {item.categoryEmoji && PACKING_ICON_MAP[item.categoryEmoji] ? (
                                        (() => { const EI = PACKING_ICON_MAP[item.categoryEmoji!]; return <EI className="w-6 h-6 shrink-0" />; })()
                                      ) : item.categoryEmoji ? (
                                        <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
                                      ) : (
                                        <ItemIcon className="w-6 h-6 shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-bold flex items-center flex-wrap gap-2 ${item.isPacked ? "line-through text-gray-500" : ""}`}>
                                          {item.name}
                                          {item.quantity > 1 && (
                                            <span className="text-gray-500">×{item.quantity}</span>
                                          )}
                                          {item.claimedBy?.id === session.user.id && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-teal-500/15 border border-teal-500/40 text-teal-400 normal-case tracking-normal">
                                              {t("packing.yours")}
                                            </span>
                                          )}
                                        </p>
                                        {item.claimedBy && (
                                          <p className="text-xs text-gray-500">
                                            {t("packing.claimedBy")} {item.claimedBy.name || item.claimedBy.email}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 pl-7 md:pl-10 items-center">
                                      {!list.isPrivate && (
                                        <button
                                          onClick={() => handleToggleClaim(item.id, item.claimedBy?.id || null)}
                                          className={`px-2 md:px-3 py-1 text-xs border transition-colors ${
                                            item.claimedBy?.id === session.user.id
                                              ? "bg-teal-500/20 border-teal-500 text-teal-400"
                                              : "border-white/20 hover:bg-white/5"
                                          }`}
                                        >
                                          {item.claimedBy?.id === session.user.id
                                            ? t("packing.unclaim")
                                            : t("packing.claim")}
                                        </button>
                                      )}
                                      {canModify(list.createdBy.id) && (
                                        <div className="relative">
                                          <button
                                            onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
                                            className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white text-sm"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                          {openMenuItemId === item.id && (
                                            <>
                                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
                                              <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[140px]">
                                                <button
                                                  onClick={() => {
                                                    setOpenMenuItemId(null);
                                                    setEditingItem(item);
                                                    setUseCustomCategory(!allKnownKeys.has(item.category));
                                                    setCustomCategory(!allKnownKeys.has(item.category) ? item.category : "");
                                                    setShowEditItemModal(true);
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                                                >
                                                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                                                  {t("common.edit")}
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setOpenMenuItemId(null);
                                                    setShowDeleteConfirm({ type: "item", id: item.id });
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                  {t("common.delete")}
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
            );
          })()}
        </div>
      </main>

      </PageTransition>

      {/* Edit Item Modal */}
      <Modal open={showEditItemModal} onClose={() => { setShowEditItemModal(false); setEditingItem(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            <span className="text-teal-400">{t("packing.editItemModal")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
          <form id="edit-item-form" onSubmit={handleEditItem} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>
            )}
            <div>
              <Label htmlFor="edit-name">{t("packing.itemName")}</Label>
              <Input id="edit-name" name="name" defaultValue={editingItem?.name ?? ""} required />
            </div>
            <div>
              <Label htmlFor="edit-quantity">{t("packing.quantity")}</Label>
              <Input id="edit-quantity" name="quantity" type="number" min="1" defaultValue={editingItem?.quantity ?? 1} required />
            </div>
            <div>
              <Label>Category</Label>
              {!useCustomCategory ? (
                <div className="space-y-1">
                  <Select name="category" defaultValue={editingItem?.category ?? ""}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => { setUseCustomCategory(true); setCustomCategory(""); setCustomEmoji(""); }}
                    className="text-xs text-teal-400 hover:text-teal-300"
                  >
                    + Custom category
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("packing.customCategory")}
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => { setUseCustomCategory(false); setCustomCategory(""); setCustomEmoji(""); }}
                      className="px-3 py-2 text-sm border border-white/20 hover:bg-white/5 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{t("packing.pickIcon")}</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomEmoji("")}
                        className={`p-2 flex items-center justify-center border transition-colors ${customEmoji === "" ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300"}`}
                        title="No icon"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      {Object.entries(PACKING_ICON_MAP).map(([name, Icon]) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setCustomEmoji(name)}
                          className={`p-2 flex items-center justify-center border transition-colors ${customEmoji === name ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300"}`}
                          title={name}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="edit-item-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowEditItemModal(false); setEditingItem(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create List Modal */}
      <Modal open={showCreateListModal} onClose={() => {
        setShowCreateListModal(false);
        setError("");
        setIsPrivate(false);
        setNewListTab("create");
        setImportCode("");
        setImportPreview(null);
        setImportPreviewError("");
      }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("packing.newListModal").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("packing.newListModal").split(" ").slice(1).join(" ")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
          {/* Tab bar */}
          <div className="flex border-b border-white/10 mb-6 -mt-2">
            <button
              type="button"
              onClick={() => setNewListTab("create")}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                newListTab === "create"
                  ? "border-b-2 border-teal-400 text-teal-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("common.create")}
            </button>
            <button
              type="button"
              onClick={() => setNewListTab("import")}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
                newListTab === "import"
                  ? "border-b-2 border-teal-400 text-teal-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("packing.importByCode")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateListModal(false);
                setNewListTab("create");
                setImportCode("");
                setImportPreview(null);
                setImportPreviewError("");
                router.push(`/${locale}/templates?tab=packing`);
              }}
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              {t("packing.browseTemplates")}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Create tab */}
          {newListTab === "create" && (
            <form id="create-list-form" onSubmit={handleCreateList} className="space-y-4">
              {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">{error}</div>}
              <div>
                <Label htmlFor="name">{t("packing.listName")} *</Label>
                <Input id="name" name="name" placeholder={t("packing.listName")} required />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="w-5 h-5 cursor-pointer" />
                <div>
                  <span className="text-sm font-medium flex items-center gap-1"><Lock className="w-4 h-4 inline" /> {t("packing.private")}</span>
                  <p className="text-xs text-gray-500">{t("packing.privateList")}</p>
                </div>
              </label>
            </form>
          )}

          {/* Import tab */}
          {newListTab === "import" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={importCode}
                  onChange={(e) => { setImportCode(e.target.value); setImportPreview(null); setImportPreviewError(""); }}
                  placeholder={t("packing.importCodePlaceholder")}
                  className="flex-1 font-mono"
                />
                <Button variant="outline" onClick={handleImportPreview} disabled={!importCode.trim() || importPreviewLoading}>
                  {importPreviewLoading ? "..." : t("packing.importPreview")}
                </Button>
              </div>
              {importPreviewError && (
                <p className="text-red-400 text-sm">{importPreviewError}</p>
              )}
              {importPreview && (
                <div className="border border-white/10 p-4 bg-white/3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold">{importPreview.name}</h4>
                    <span className="text-xs text-gray-500">{importPreview.items.length} {t("templates.items")}</span>
                  </div>
                  {importPreview.templateDescription && (
                    <p className="text-xs text-gray-400 mb-3">{importPreview.templateDescription}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-3">{t("templates.by")} {importPreview.createdBy.name || importPreview.createdBy.email}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-40 overflow-y-auto">
                    {importPreview.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                        {item.categoryEmoji ? (
                          <span>{item.categoryEmoji}</span>
                        ) : (
                          <span className="w-2.5 h-2.5 border border-white/20 flex-shrink-0" />
                        )}
                        <span>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {newListTab === "create" ? (
            <>
              <Button type="submit" form="create-list-form" variant="gradient" className="flex-1" loading={isSubmitting}>
                {isSubmitting ? t("common.saving") : t("packing.createList")}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateListModal(false);
                setError("");
                setIsPrivate(false);
                setNewListTab("create");
                setImportCode("");
                setImportPreview(null);
                setImportPreviewError("");
              }} className="flex-1">
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="gradient"
                className="flex-1"
                disabled={!importPreview || isImporting}
                onClick={handleImportConfirm}
                loading={isImporting}
              >
                {isImporting ? t("packing.importing") : t("packing.importConfirm")}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateListModal(false);
                setNewListTab("create");
                setImportCode("");
                setImportPreview(null);
                setImportPreviewError("");
              }} className="flex-1">
                {t("common.cancel")}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Publish as Template Modal */}
      <Modal open={showPublishModal} onClose={() => { setShowPublishModal(false); setPublishDescription(""); setPublishListId(null); }}>
        <Modal.Header>
          <h2 className="text-3xl font-black tracking-tight">
            {t("packing.publishModal").split(" ")[0]}{" "}
            <span className="text-teal-400">{t("packing.publishModal").split(" ").slice(1).join(" ")}</span>
          </h2>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="publish-description">{t("packing.publishDescription")}</Label>
              <textarea
                id="publish-description"
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder={t("packing.publishDescriptionPlaceholder")}
                rows={4}
                className="w-full bg-[#1a1a1a] border border-white/20 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-400 transition-colors"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="gradient" className="flex-1" onClick={handlePublish} loading={isPublishing}>
            {isPublishing ? t("common.saving") : t("packing.publishConfirm")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowPublishModal(false); setPublishDescription(""); setPublishListId(null); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={showDeleteConfirm.type === "list" ? t("packing.deleteListTitle") : t("packing.deleteItemTitle")}
          message={showDeleteConfirm.type === "list" ? t("packing.deleteListConfirm") : t("packing.deleteItemConfirm")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Add Item Modal */}
      <Modal open={showAddItemModal} onClose={() => { setShowAddItemModal(false); setSelectedListId(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }}>
        <Modal.Header>
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-black tracking-tight">
              {t("packing.addItemModal").split(" ")[0]}{" "}
              <span className="text-teal-400">{t("packing.addItemModal").split(" ").slice(1).join(" ")}</span>
            </h2>
            <button onClick={() => { setShowAddItemModal(false); setSelectedListId(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none p-1">✕</button>
          </div>
        </Modal.Header>
        <Modal.Body>
            <form id="add-item-form" onSubmit={handleAddItem} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="item-name">{t("packing.itemName")} *</Label>
                <Input
                  id="item-name"
                  name="name"
                  placeholder={t("packing.itemName")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity">{t("packing.quantity")}</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </div>

              <div>
                <Label htmlFor="item-category">{t("itinerary.category")}</Label>
                {useCustomCategory ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        id="custom-category"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder={t("packing.customCategory")}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => { setUseCustomCategory(false); setCustomCategory(""); setCustomEmoji(""); }}
                        className="px-3 py-2 text-sm border border-white/20 hover:bg-white/5 transition-colors"
                        title={t("common.cancel")}
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">{t("packing.pickIcon")}</p>
                      <div className="grid grid-cols-7 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCustomEmoji("")}
                          className={`p-2 flex items-center justify-center border transition-colors ${customEmoji === "" ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300"}`}
                          title="No icon"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        {Object.entries(PACKING_ICON_MAP).map(([name, Icon]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setCustomEmoji(name)}
                            className={`p-2 flex items-center justify-center border transition-colors ${customEmoji === name ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/15 text-gray-500 hover:border-white/30 hover:text-gray-300"}`}
                            title={name}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      id="item-category"
                      name="category"
                    >
                      <option value="">{t("common.select")}</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => setUseCustomCategory(true)}
                      className="text-xs text-gray-400 hover:text-teal-400 transition-colors"
                    >
                      <Pencil className="w-3 h-3 inline mr-1" />{t("packing.customCategory")}
                    </button>
                  </div>
                )}
              </div>

            </form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" form="add-item-form" variant="gradient" className="flex-1" loading={isSubmitting}>
            {isSubmitting ? t("common.saving") : t("packing.addItem")}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setShowAddItemModal(false); setSelectedListId(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }} className="flex-1">
            {t("common.cancel")}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
