# Fast Edit Mode — Packing List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a split-panel text-edit mode to each packing list card so users can bulk-enter items as a plain-text outline (category + indented items) instead of clicking per-item modals.

**Architecture:** A new `PackingFastEditor` React component replaces the list card body when edit mode is active. It contains a textarea (left) and live preview (right), both driven by a pure `parsePackingText` function. On save, a new bulk API endpoint replaces all items in the list in a single Prisma transaction.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Zod, Tailwind CSS, Lucide React, Vitest (added in Task 1)

---

## File Map

| Status | Path | Role |
|--------|------|------|
| **Create** | `src/lib/packingCategories.ts` | Exports `CATEGORY_ICON` (hoisted from `page.tsx`) |
| **Create** | `src/lib/parsePackingText.ts` | Pure function: text → `ParsedItem[]` |
| **Create** | `src/lib/parsePackingText.test.ts` | Vitest unit tests for the parser |
| **Create** | `src/components/PackingFastEditor.tsx` | Split-panel editor component |
| **Create** | `src/app/api/trips/[tripId]/packing/[listId]/bulk/route.ts` | PUT endpoint for bulk replace |
| **Modify** | `src/app/[locale]/trips/[tripId]/packing/page.tsx` | Add edit mode toggle + import `CATEGORY_ICON` from new file |
| **Modify** | `src/lib/validations/packing.ts` | Add `bulkUpdatePackingItemsSchema` |
| **Modify** | `vitest.config.ts` *(new)* | Vitest configuration |
| **Modify** | `package.json` | Add `vitest` and `@vitejs/plugin-react` dev deps, add `test` script |

---

## Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    passWithNoTests: true, // required so vitest exits 0 when no test files exist yet
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify setup works**

```bash
npm run test
```

Expected: "No test files found" (not an error exit).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add Vitest test setup"
```

---

## Task 2: Extract `CATEGORY_ICON` to `packingCategories.ts`

**Files:**
- Create: `src/lib/packingCategories.ts`
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`

The `CATEGORY_ICON` constant is currently defined inside the `PackingPage` component function. Extracting it to a module lets `PackingFastEditor` import it without prop-drilling.

- [ ] **Step 1: Create `src/lib/packingCategories.ts`**

```ts
import type { LucideIcon } from "lucide-react";
import {
  Shirt, Droplets, Plug, FileText, Tent, CookingPot, Wrench,
  Flashlight, Footprints, Compass, ShieldCheck, Waves, Anchor,
  Car, Cookie, Mountain, Briefcase, Package,
} from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  clothing: Shirt,
  toiletries: Droplets,
  electronics: Plug,
  documents: FileText,
  shelter: Tent,
  cooking: CookingPot,
  tools: Wrench,
  lighting: Flashlight,
  gear: Footprints,
  navigation: Compass,
  safety: ShieldCheck,
  beach: Waves,
  watersports: Anchor,
  car: Car,
  snacks: Cookie,
  skigear: Mountain,
  formal: Briefcase,
  other: Package,
};
```

- [ ] **Step 2: Update `page.tsx` to import from new file**

In `src/app/[locale]/trips/[tripId]/packing/page.tsx`:

1. Add import at the top:
```ts
import { CATEGORY_ICON } from "@/lib/packingCategories";
```

2. Remove the `CATEGORY_ICON` const block (lines 76–84) from inside `PackingPage`. The import replaces it.

3. Remove the now-redundant lucide imports that were only used by `CATEGORY_ICON`: `Shirt, Droplets, Plug, FileText, Tent, CookingPot, Wrench, Flashlight, Footprints, Compass, ShieldCheck, Waves, Anchor, Car, Cookie, Mountain, Briefcase, Package`. These are now imported inside `packingCategories.ts`. Keep the icons still referenced directly in page JSX: `Lock, Pencil, Backpack, Share2, Copy, Check, ExternalLink, MoreVertical`.

- [ ] **Step 3: Verify the page still compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to `CATEGORY_ICON` or icon imports.

- [ ] **Step 4: Commit**

```bash
git add src/lib/packingCategories.ts src/app/[locale]/trips/[tripId]/packing/page.tsx
git commit -m "refactor: extract CATEGORY_ICON to packingCategories.ts"
```

---

## Task 3: Implement `parsePackingText` with TDD

**Files:**
- Create: `src/lib/parsePackingText.test.ts`
- Create: `src/lib/parsePackingText.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/parsePackingText.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePackingText } from "./parsePackingText";

describe("parsePackingText", () => {
  it("returns empty array for empty string", () => {
    expect(parsePackingText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parsePackingText("   \n\n  ")).toEqual([]);
  });

  it("parses a simple category with one item", () => {
    const result = parsePackingText("Clothing\n  T-shirt");
    expect(result).toEqual([{ name: "T-shirt", quantity: 1, category: "clothing" }]);
  });

  it("normalises category name to lowercase", () => {
    const result = parsePackingText("ELECTRONICS\n  Charger");
    expect(result[0].category).toBe("electronics");
  });

  it("parses multiple categories", () => {
    const result = parsePackingText("Clothing\n  Shirt\nToiletries\n  Soap");
    expect(result).toEqual([
      { name: "Shirt", quantity: 1, category: "clothing" },
      { name: "Soap", quantity: 1, category: "toiletries" },
    ]);
  });

  it("parses trailing x<N> quantity", () => {
    const result = parsePackingText("Clothing\n  T-shirts x3");
    expect(result[0]).toEqual({ name: "T-shirts", quantity: 3, category: "clothing" });
  });

  it("parses leading <N>x quantity", () => {
    const result = parsePackingText("Clothing\n  2x Socks");
    expect(result[0]).toEqual({ name: "Socks", quantity: 2, category: "clothing" });
  });

  it("trailing x<N> wins over leading when both present", () => {
    const result = parsePackingText("Clothing\n  2x Socks x3");
    expect(result[0]).toEqual({ name: "2x Socks", quantity: 3, category: "clothing" });
  });

  it("does not parse quantity from hyphenated strings like 3-in-1", () => {
    const result = parsePackingText("Toiletries\n  3-in-1 shampoo");
    expect(result[0]).toEqual({ name: "3-in-1 shampoo", quantity: 1, category: "toiletries" });
  });

  it("does not parse trailing hyphenated word as quantity", () => {
    const result = parsePackingText("Toiletries\n  Shampoo 2-in-1");
    expect(result[0]).toEqual({ name: "Shampoo 2-in-1", quantity: 1, category: "toiletries" });
  });

  it("assigns orphaned items (before any category) to 'other'", () => {
    const result = parsePackingText("  Orphan item");
    expect(result[0].category).toBe("other");
  });

  it("ignores empty lines", () => {
    const result = parsePackingText("Clothing\n\n  Shirt\n\n  Pants");
    expect(result).toHaveLength(2);
  });

  it("handles tab indentation", () => {
    const result = parsePackingText("Clothing\n\tShirt");
    expect(result[0]).toEqual({ name: "Shirt", quantity: 1, category: "clothing" });
  });

  it("strips quantity token from name (trailing)", () => {
    const result = parsePackingText("Clothing\n  Vitamin C x2");
    expect(result[0].name).toBe("Vitamin C");
    expect(result[0].quantity).toBe(2);
  });

  it("strips quantity token from name (leading)", () => {
    const result = parsePackingText("Clothing\n  2x Socks");
    expect(result[0].name).toBe("Socks");
  });

  it("quantity defaults to 1 when no token present", () => {
    const result = parsePackingText("Clothing\n  Rain jacket");
    expect(result[0].quantity).toBe(1);
  });

  it("returns items in declaration order", () => {
    const result = parsePackingText("A\n  item1\n  item2\nB\n  item3");
    expect(result.map((i) => i.name)).toEqual(["item1", "item2", "item3"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: fails with "Cannot find module './parsePackingText'".

- [ ] **Step 3: Implement `parsePackingText`**

Create `src/lib/parsePackingText.ts`:

```ts
export interface ParsedItem {
  name: string;
  quantity: number;
  category: string;
}

/**
 * Trailing quantity: "Socks x3" → { name: "Socks", quantity: 3 }
 * Token must be the entire last word: /\s+x(\d+)$/i
 * Must NOT be part of a hyphenated word (e.g. "3-in-1" is not a quantity)
 */
function parseTrailingQuantity(raw: string): { name: string; quantity: number } {
  const match = raw.match(/^(.*)\s+x(\d+)$/i);
  if (match) {
    // Reject if the matched last word contains a hyphen (e.g. "2-in-1")
    return { name: match[1].trim(), quantity: parseInt(match[2], 10) };
  }
  return { name: raw, quantity: 1 };
}

/**
 * Leading quantity: "2x Socks" → { name: "Socks", quantity: 2 }
 * Token must be the entire first word: /^(\d+)x\s+/i
 */
function parseLeadingQuantity(raw: string): { name: string; quantity: number } {
  const match = raw.match(/^(\d+)x\s+(.*)/i);
  if (match) {
    return { name: match[2].trim(), quantity: parseInt(match[1], 10) };
  }
  return { name: raw, quantity: 1 };
}

function parseQuantity(raw: string): { name: string; quantity: number } {
  // Try trailing first; if found, use it (leading token stays in name).
  const trailing = parseTrailingQuantity(raw);
  if (trailing.quantity !== 1 || raw.match(/\s+x1$/i)) {
    return trailing;
  }
  // Fall back to leading.
  return parseLeadingQuantity(raw);
}

export function parsePackingText(text: string): ParsedItem[] {
  const lines = text.split("\n");
  const items: ParsedItem[] = [];
  let currentCategory = "other";
  let hasSeenCategory = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    const isIndented = /^[\s\t]/.test(line);

    if (!isIndented) {
      // Category line
      currentCategory = line.trim().toLowerCase();
      hasSeenCategory = true;
    } else {
      // Item line
      const rawName = line.trim();
      const { name, quantity } = parseQuantity(rawName);
      items.push({
        name,
        quantity,
        category: hasSeenCategory ? currentCategory : "other",
      });
    }
  }

  return items;
}
```

- [ ] **Step 4: Run tests and verify they all pass**

```bash
npm test
```

Expected: all tests in `parsePackingText.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsePackingText.ts src/lib/parsePackingText.test.ts
git commit -m "feat: add parsePackingText pure function with tests"
```

---

## Task 4: Add bulk validation schema

**Files:**
- Modify: `src/lib/validations/packing.ts`

- [ ] **Step 1: Add `bulkUpdatePackingItemsSchema` to `src/lib/validations/packing.ts`**

Append to the end of the file:

```ts
export const bulkUpdatePackingItemsSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Item name is required").max(100, "Name too long"),
        quantity: z.number().int().positive("Quantity must be positive"),
        category: z.string().min(1).max(50, "Category name too long"),
      })
    )
    .max(200, "Maximum 200 items"),
});

export type BulkUpdatePackingItemsInput = z.infer<typeof bulkUpdatePackingItemsSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/packing.ts
git commit -m "feat: add bulkUpdatePackingItemsSchema"
```

---

## Task 5: Implement the bulk API endpoint

**Files:**
- Create: `src/app/api/trips/[tripId]/packing/[listId]/bulk/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canModifyItem } from "@/lib/permissions";
import { bulkUpdatePackingItemsSchema } from "@/lib/validations/packing";
import { createActivity } from "@/lib/db/activities";
import { z } from "zod";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tripId: string; listId: string }> }
) {
  try {
    const { tripId, listId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resource existence + ownership check
    const list = await prisma.packingList.findUnique({
      where: { id: listId },
      select: { id: true, tripId: true, name: true, createdById: true },
    });

    if (!list || list.tripId !== tripId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Permission check (same rules as other packing handlers)
    const allowed = await canModifyItem(tripId, session.user.id, list.createdById);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate body
    const body = await req.json();
    const { items } = bulkUpdatePackingItemsSchema.parse(body);

    // Atomic replace
    const newItems = await prisma.$transaction(async (tx) => {
      await tx.packingItem.deleteMany({ where: { packingListId: listId } });
      await tx.packingItem.createMany({
        data: items.map((item) => ({
          packingListId: listId,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          categoryEmoji: null,
        })),
      });
      return tx.packingItem.findMany({
        where: { packingListId: listId },
        include: {
          claimedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    });

    // Fire-and-forget activity log
    createActivity({
      tripId,
      userId: session.user.id,
      action: "bulk_edited",
      entityType: "packing",
      entityId: listId,
      entityName: list.name,
    }).catch(() => {});

    return NextResponse.json({ items: newItems }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Bulk packing update error:", error);
    return NextResponse.json({ error: "Failed to update packing list" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors from the new file.

- [ ] **Step 3: Smoke test the endpoint manually**

Start the dev server (`npm run dev`) and use curl or a REST client to `PUT /api/trips/<real-tripId>/packing/<real-listId>/bulk` with:
```json
{ "items": [{ "name": "Test", "quantity": 1, "category": "other" }] }
```
Expected: 401 when unauthenticated; 200 with items array when authenticated with correct ids.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/[tripId]/packing/[listId]/bulk/route.ts
git commit -m "feat: add PUT /packing/[listId]/bulk endpoint for fast edit"
```

---

## Task 6: Implement `PackingFastEditor` component

**Files:**
- Create: `src/components/PackingFastEditor.tsx`

This component renders the split-panel editor. It imports `CATEGORY_ICON` directly from `packingCategories.ts` and `parsePackingText` from the parser.

- [ ] **Step 1: Create `src/components/PackingFastEditor.tsx`**

```tsx
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

export function PackingFastEditor({ list, tripId, onSave, onCancel }: PackingFastEditorProps) {
  const [text, setText] = useState(() => serialiseList(list.items));
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPackedOrClaimed = list.items.some((i) => i.isPacked || i.claimedBy);

  // Debounced parse
  const updateParsed = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const lineCount = value.split("\n").length;
      if (lineCount > 300) {
        setParsed([]); // preview skipped for very long input
      } else {
        setParsed(parsePackingText(value));
      }
    }, 150);
  }, []);

  useEffect(() => {
    updateParsed(text);
  }, [text, updateParsed]);

  const lineCount = text.split("\n").length;
  const previewSkipped = lineCount > 300;
  const itemCount = parsed.length;
  const orphanCount = parsed.filter((i) => i.category === "other").length;
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
      // Surface error via alert for simplicity; page.tsx uses toast — the parent
      // can add toast handling if needed.
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  }

  // Group parsed items for preview
  const previewGroups: [string, ParsedItem[]][] = [];
  for (const item of parsed) {
    const last = previewGroups[previewGroups.length - 1];
    if (last && last[0] === item.category) {
      last[1].push(item);
    } else {
      previewGroups.push([item.category, [item]]);
    }
  }

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
            disabled={overLimit || isSaving}
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
                        <div key={idx} className="text-gray-400 text-xs">
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
          ✓ {parsed.filter((i, idx, arr) => arr.findIndex((j) => j.category === i.category) === idx).length} categories · {itemCount} items parsed
        </span>
        {orphanCount > 0 && (
          <span className="text-amber-400">{orphanCount} item{orphanCount > 1 ? "s" : ""} without category → "other"</span>
        )}
        <span className="ml-auto text-gray-600">Saving replaces all items in this list</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PackingFastEditor.tsx
git commit -m "feat: add PackingFastEditor split-panel component"
```

---

## Task 7: Wire up edit mode in `page.tsx`

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`

This task adds the "Edit as text" button to each list card header and toggles between normal view and `PackingFastEditor`.

- [ ] **Step 1: Add `editingListId` state**

Inside `PackingPage`, add one new state variable after the existing state declarations:

```ts
const [editingListId, setEditingListId] = useState<string | null>(null);
```

- [ ] **Step 2: Add import for `PackingFastEditor`**

```ts
import { PackingFastEditor } from "@/components/PackingFastEditor";
```

- [ ] **Step 3: Add the "Edit as text" button to the list header**

In the list header area (around line 797, inside `sharedLists.map`), add an "Edit as text" button alongside the existing "+ Add item" button. Only show it when `canModify(list.createdBy.id)` is true:

```tsx
{canModify(list.createdBy.id) && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setEditingListId(list.id)}
  >
    ✏️ Edit as text
  </Button>
)}
```

Place this button before the `+ Add item` button in the flex container.

- [ ] **Step 4: Replace list card body with `PackingFastEditor` when editing**

After the list header section and before the items rendering, add a conditional:

```tsx
{editingListId === list.id ? (
  <PackingFastEditor
    list={list}
    tripId={tripId}
    onSave={() => {
      setEditingListId(null);
      fetchLists();
    }}
    onCancel={() => setEditingListId(null)}
  />
) : (
  /* existing items rendering — the block starting with:
     list.items.length === 0 ? (
       <p className="text-gray-500 ...">
     ) : (
       groupItemsByCategory(...).map(...)
     )
  */
  <>
    {/* existing items JSX — unchanged */}
  </>
)}
```

Wrap the existing items block (empty state + grouped items) in the `else` branch without changing it.

- [ ] **Step 5: Hide the "Add item" and kebab menu buttons while editing**

When `editingListId === list.id`, hide the `+ Add item` button and the kebab menu to avoid confusing interactions. Wrap them with `{editingListId !== list.id && (...)}`.

- [ ] **Step 6: Verify the page compiles and renders**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

Then start the dev server and manually test:
1. Open a trip's packing page.
2. Click "✏️ Edit as text" on a list.
3. Verify the split-panel appears.
4. Type a few lines and verify the preview updates.
5. Click Cancel — verify normal view restored.
6. Type items, click Save Changes → confirm → verify items replaced in normal view.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/packing/page.tsx
git commit -m "feat: wire up PackingFastEditor in packing page"
```

---

## Task 8: Error handling — wire up toast for save errors

**Files:**
- Modify: `src/components/PackingFastEditor.tsx`

The `PackingFastEditor` currently uses `alert()` for save errors. The page uses a `toast` hook. Pass error handling back through the `onSave` callback or add a simple toast integration.

The simplest approach: expose an `onError` prop and call it with the error message. The parent passes `toast.error`.

- [ ] **Step 1: Add `onError` prop to `PackingFastEditor`**

In `PackingFastEditorProps`:
```ts
onError?: (message: string) => void;
```

In `handleSave`, replace `alert(...)` with:
```ts
if (onError) onError(e instanceof Error ? e.message : "Failed to save");
```

- [ ] **Step 2: Pass `onError` from `page.tsx`**

```tsx
<PackingFastEditor
  list={list}
  tripId={tripId}
  onSave={() => { setEditingListId(null); fetchLists(); }}
  onCancel={() => setEditingListId(null)}
  onError={(msg) => toast.error(msg)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PackingFastEditor.tsx src/app/[locale]/trips/[tripId]/packing/page.tsx
git commit -m "feat: wire toast error handling into PackingFastEditor"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: End-to-end smoke test**

Start `npm run dev` and manually verify the full flow:

1. Open a packing list with some packed items — verify the yellow warning banner appears in edit mode.
2. Type a fresh list, save — verify items are replaced correctly.
3. Open edit mode and click Cancel — verify no changes.
4. Type 201+ items — verify Save button disabled.
5. Type an indented item with no preceding category — verify "other" appears in preview and status bar shows warning.
6. Verify normal list view is completely unchanged for lists not in edit mode.
