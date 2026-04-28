# UX Fixes (Round 2) — Design Spec

Date: 2026-03-23

## Overview

Five UX improvements: consolidating the packing page header buttons, improving poll vote bars, adding an expense category summary, showing each user's share on expense rows, and fixing expense card mobile overflow by moving edit/delete behind a ··· menu.

All changes are frontend-only. No API or DB changes required.

---

## Fix A: Consolidate packing header buttons into a tabbed modal

**Problem:** The packing page header has three buttons — "Import by Code", "Browse Templates", and "+ New List" — which is cluttered, especially on mobile.

**Solution:** Remove the "Import by Code" and "Browse Templates" buttons from the header. Keep only the "+ New List" button. Inside the New List modal, add a tab bar with three options: **Create**, **Import by Code**, and **Browse Templates**. Create and Import by Code are content tabs; Browse Templates navigates to `/templates?tab=packing` when clicked.

**Implementation:**
- Remove `showImportModal` state and the separate Import Modal (lines ~1132–1200 in `packing/page.tsx`)
- Add `newListTab: "create" | "import"` state (default `"create"`)
- The existing Create List modal gains a tab bar at the top of its body:
  - **Create** tab: renders the existing name + private checkbox form
  - **Import by Code** tab: renders the existing import-by-code content (code input, preview button, preview card, confirm button)
  - **Browse Templates** button: styled as a third tab, but on click calls `router.push(\`/${locale}/templates?tab=packing\`)` and closes the modal
- When the modal closes (any path), reset `newListTab` to `"create"` and clear all relevant state (`error`, `isPrivate`, `importCode`, `importPreview`, `importPreviewError`)
- The Modal footer adapts per tab: Create tab shows "Create List" + "Cancel"; Import by Code tab shows "Add to this trip" + "Cancel" (matching current import modal footer)
- Remove the two outline buttons from the header `<div className="flex flex-wrap gap-2 flex-shrink-0">` — only the gradient "+ New List" button remains
- No new i18n keys needed; reuse `packing.importByCode`, `packing.browseTemplates`, `common.create`

---

## Fix B: Always use teal gradient for poll vote bars

**Problem:** Poll vote bars already exist in the UI but use `bg-gray-600` for options the user hasn't voted on. This makes unvoted options look inactive even when other members have voted. The bar also only renders when `totalVotes > 0`, so with 0 votes there's no bar at all.

**Solution:** Always render the bar (even at 0% width) and use the teal gradient for all bars regardless of whether the current user voted on that option. Voted options keep the teal active border/background on the button; the bar color no longer signals user's own vote.

**Implementation:**
- In `polls/page.tsx`, find the vote bar block (currently `{stats.totalVotes > 0 && (<div ...>`)
- Remove the `stats.totalVotes > 0` conditional — always render the bar `<div>`
- Change the inner bar's className from the conditional `userVotedThis ? "bg-teal-500" : "bg-gray-600"` to always use `bg-gradient-to-r from-teal-400 to-cyan-500`
- No other changes; the button's border/background (`border-teal-500 bg-teal-500/10` when voted) still communicates the user's own vote
- No API or i18n changes required

---

## Fix C: Expense category breakdown strip

**Problem:** The only spending summary is the plain-text "X expenses · €Y total" in the page subtitle. There's no way to see at a glance how money was split across categories.

**Solution:** Add a compact horizontal breakdown strip directly above the "TRANSACTIONS" heading. It shows the grand total on the left, a divider, then one column per category that has at least one expense. Each column shows the translated category label (teal, small caps) and the summed amount below it.

**Implementation:**
- In `expenses/page.tsx`, compute the per-category totals inline above the transactions section:
  ```ts
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] ?? 0) + Number(exp.amount);
    return acc;
  }, {});
  ```
- Only render the strip when `expenses.length > 0`
- Render a `<div className="flex flex-wrap gap-4 items-end mb-6 pb-6 border-b border-white/10">` before the "TRANSACTIONS" heading
- Total column: label `text-gray-500 text-xs uppercase tracking-widest`, value `text-white text-xl font-black`
- Divider: `<div className="w-px bg-white/10 h-8 self-center" />`
- Per-category columns: label `text-teal-400 text-xs font-bold uppercase tracking-widest`, value `text-gray-300 text-sm font-bold`
- Use `t(\`expenses.categories.${category}\`)` for the label (keys already exist: `food`, `accommodation`, `transport`, `activity`, `other`)
- No new i18n keys required

---

## Fix D: Show current user's share on each expense card

**Problem:** Each expense card shows the total amount but doesn't highlight how much the current user personally owes. Users have to scan the small per-person split tags to find their number.

**Solution:** Below the total amount on the right side of each expense card, add a small "your share: €X" label showing the current user's split amount. Only show it if the current user has a split entry in that expense.

**Implementation:**
- In the expense card render (inside the `group.map((expense) => ...)` block), find the current user's split:
  ```ts
  const mySplit = expense.splits.find(s => s.user.id === session.user.id);
  ```
- Below the `text-2xl font-black text-teal-400` amount div, add:
  ```tsx
  {mySplit && (
    <div className="text-xs text-gray-500">
      {t("expenses.yourShare")}: <span className="text-gray-300 font-bold">{formatCurrency(Number(mySplit.amount))}</span>
    </div>
  )}
  ```
- Add `"yourShare": "your share"` to `messages/en.json` under `"expenses"`
- Add `"yourShare": "dein Anteil"` to `messages/de.json` under `"expenses"`

---

## Fix F: Move expense edit/delete behind ··· menu (fixes mobile overflow)

**Problem:** Each expense card has inline Edit and Delete buttons beside the amount. On mobile the card content overflows its container because the right side (`text-2xl` amount + two buttons) can't fit in a single row.

**Solution:** Remove the inline Edit and Delete buttons. Add a small ··· button below the amount that opens a dropdown with Edit and Delete. This is gated on `canModify(expense.paidBy.id)` (same condition as the existing buttons). Consistent with the ··· pattern on packing items.

**Implementation:**
- Add `openMenuExpenseId: string | null` state (default `null`)
- In the expense card, replace the `{canModify(expense.paidBy.id) && <div className="flex gap-2">...</div>}` block with:
  ```tsx
  {canModify(expense.paidBy.id) && (
    <div className="relative">
      <button
        onClick={() => setOpenMenuExpenseId(openMenuExpenseId === expense.id ? null : expense.id)}
        className="w-7 h-7 flex items-center justify-center border border-white/20 text-gray-400 hover:border-white/40 transition-colors text-sm tracking-widest"
      >···</button>
      {openMenuExpenseId === expense.id && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-10 min-w-[120px]">
          <button onClick={() => { openEditModal(expense); setOpenMenuExpenseId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2">
            <Pencil className="w-3 h-3" />{t("common.edit")}
          </button>
          <button onClick={() => { setShowDeleteConfirm(expense.id); setOpenMenuExpenseId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
            <Trash2 className="w-3 h-3" />{t("common.delete")}
          </button>
        </div>
      )}
    </div>
  )}
  ```
- Import `Pencil` and `Trash2` from `lucide-react` (add to existing import line)
- Add a click-outside handler: in `useEffect`, add `document.addEventListener("click", handleClickOutside)` that calls `setOpenMenuExpenseId(null)` when clicking outside a `.expense-menu` container. Alternatively, use the same inline `onClick` toggle pattern already used in packing — simpler approach: wrap the ··· button + dropdown in `onClick={(e) => e.stopPropagation()}` and add a `useEffect` for `mousedown` on document that clears the menu.
- No new i18n keys required (reuses `common.edit` and `common.delete`)

---

## Affected Files

- `src/app/[locale]/trips/[tripId]/packing/page.tsx` — Fix A
- `src/app/[locale]/trips/[tripId]/polls/page.tsx` — Fix B
- `src/app/[locale]/trips/[tripId]/expenses/page.tsx` — Fix C, D, F
- `messages/en.json` — Fix D (`expenses.yourShare`)
- `messages/de.json` — Fix D (`expenses.yourShare`)

---

## Out of Scope

- Expense chart/graph visualization (pie chart, bar chart)
- Filtering or searching expenses by category
- Poll expiry UI improvements
- Any backend changes
