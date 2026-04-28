"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parsePackingText, ParsedItem } from "@/lib/parsePackingText";
import { CATEGORY_ICON } from "@/lib/packingCategories";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PackingItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  categoryEmoji: string | null;
  isPacked: boolean;
  claimedBy: { id: string } | null;
}

interface PackingList {
  id: string;
  name: string;
  items: PackingItem[];
}

interface PackingFastEditorProps {
  list: PackingList;
  tripId: string;
  onSave: () => void;
  onCancel: () => void;
  onError?: (message: string) => void;
}

/** Serialise existing list items to the text format */
function serialiseList(items: PackingItem[]): string {
  if (items.length === 0) return "";

  // Group by category, preserving order of first appearance (items ordered createdAt asc by API)
  const groups = new Map<string, PackingItem[]>();
  for (const item of items) {
    const cat = item.category || "other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  const lines: string[] = [];
  for (const [category, groupItems] of groups) {
    lines.push(category);
    for (const item of groupItems) {
      const qty = item.quantity > 1 ? ` x${item.quantity}` : "";
      lines.push(`  ${item.name}${qty}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function PackingFastEditor({ list, tripId, onSave, onCancel, onError }: PackingFastEditorProps) {
  const [text, setText] = useState(() => serialiseList(list.items));
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [previewSkipped, setPreviewSkipped] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPackedOrClaimed = useRef(list.items.some((i) => i.isPacked || i.claimedBy)).current;

  // Debounced parse
  const updateParsed = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const lineCount = value.split("\n").length;
      if (lineCount > 300) {
        setPreviewSkipped(true);
        setParsed([]);
      } else {
        setPreviewSkipped(false);
        setParsed(parsePackingText(value));
      }
    }, 150);
  }, []);

  useEffect(() => {
    updateParsed(text);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, updateParsed]);

  const itemCount = parsed.length;
  const orphanCount = parsed.filter((i) => i.category === "other").length;
  const categoryCount = new Set(parsed.map((i) => i.category)).size;
  const overLimit = itemCount > 200;

  async function handleSave() {
    setIsSaving(true);
    try {
      const items = parsePackingText(text);
      const res = await fetch(`/api/trips/${tripId}/packing/${list.id}/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      onSave();
    } catch (e) {
      console.error(e);
      if (onError) onError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  }

  // Group parsed items for preview
  const groupMap = new Map<string, ParsedItem[]>();
  for (const item of parsed) {
    if (!groupMap.has(item.category)) groupMap.set(item.category, []);
    groupMap.get(item.category)!.push(item);
  }
  const previewGroups = Array.from(groupMap.entries());

  return (
    <div className="flex flex-col border border-white/10 bg-[#0f172a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#1e293b]">
        <span className="text-sm font-semibold text-gray-300">✏️ Text Edit Mode</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="sm"
            disabled={overLimit || isSaving || showSaveConfirm}
            onClick={() => setShowSaveConfirm(true)}
          >
            {overLimit ? "200 item limit reached" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Syntax hint */}
      <div className="px-4 py-1.5 border-b border-white/10 text-xs text-gray-500">
        Category on its own line · Items indented · Quantity: x2 or 2x
      </div>

      {/* Data loss banner (shown only when packed/claimed items exist) */}
      {hasPackedOrClaimed && (
        <div className="px-4 py-2 border-b border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-400">
          ⚠️ Saving in text mode will reset packed status and claims.
        </div>
      )}

      {/* Save confirmation */}
      {showSaveConfirm && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#1e293b] flex items-center gap-4">
          <span className="text-sm text-gray-300">
            This will replace all items. Packed status and claims will be reset.
          </span>
          <div className="flex gap-2 ml-auto flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowSaveConfirm(false)} disabled={isSaving}>
              Go back
            </Button>
            <Button variant="gradient" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </div>
      )}

      {/* Split panel */}
      <div className="flex" style={{ minHeight: "320px" }}>
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-white/10">
          <div className="px-3 py-1 text-xs text-gray-600 border-b border-white/10 bg-[#0f172a]">EDIT</div>
          <textarea
            className="flex-1 w-full bg-[#0f172a] text-gray-200 font-mono text-sm p-3 resize-none outline-none leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={"Clothing\n  T-shirts x3\n  Pants\n\nToiletries\n  Toothbrush"}
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#111827]">
          <div className="px-3 py-1 text-xs text-gray-600 border-b border-white/10 bg-[#0f172a]">PREVIEW</div>
          <div className="flex-1 overflow-y-auto p-3 text-sm">
            {previewSkipped ? (
              <p className="text-gray-500 text-xs">Too many lines to preview</p>
            ) : parsed.length === 0 ? (
              <p className="text-gray-600 text-xs">Start typing to see a preview…</p>
            ) : (
              previewGroups.map(([category, groupItems]) => {
                const Icon = CATEGORY_ICON[category] || Package;
                return (
                  <div key={category} className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        {category}
                      </span>
                      <span className="ml-auto text-xs text-gray-600">{groupItems.length}</span>
                    </div>
                    <div className="pl-6 space-y-0.5">
                      {groupItems.map((item, idx) => (
                        <div key={`${item.category}-${item.name}-${idx}`} className="text-gray-400 text-xs">
                          ☐ {item.name}
                          {item.quantity > 1 && (
                            <span className="text-gray-600 ml-1">×{item.quantity}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-white/10 text-xs bg-[#0f172a]">
        <span className={overLimit ? "text-amber-400" : "text-emerald-400"}>
          ✓ {categoryCount} categories · {itemCount} items parsed
        </span>
        {orphanCount > 0 && (
          <span className="text-amber-400">{orphanCount} item{orphanCount > 1 ? "s" : ""} without category → "other"</span>
        )}
        <span className="ml-auto text-gray-600">Saving replaces all items in this list</span>
      </div>
    </div>
  );
}
