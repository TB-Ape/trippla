# Emoji to Lucide Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all decorative emoji strings site-wide with inline Lucide icons from the already-installed `lucide-react` package.

**Architecture:** Each file is updated independently — emoji strings in data arrays/functions are replaced with `LucideIcon` component references (the class, not JSX), then render sites are updated to call the component. No new files are created.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, lucide-react ^0.563.0

---

## Context for agentic workers

**No test framework exists in this project.** After every task, verification is:
```bash
npx tsc --noEmit
```
Expected output: no errors. If there are errors, fix them before committing.

**Pattern for returning a Lucide icon from a function:**
```tsx
import type { LucideIcon } from "lucide-react";
import { Sun, CloudSun } from "lucide-react";

function getIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  return CloudSun;
}

// render site:
const Icon = getIcon(code);
return <Icon className="w-4 h-4 shrink-0" />;
```

**Pattern for an icon stored in an object map:**
```tsx
const ICONS: Record<string, LucideIcon> = { food: UtensilsCrossed };
const Icon = ICONS[category] ?? MapPin;
return <Icon className="w-6 h-6 shrink-0" />;
```

**`<option>` constraint:** Native `<select><option>` elements cannot contain React nodes. Remove emoji from `{cat.emoji} {cat.label}` option text — render the label only. Icons go in the card/list display only.

**Tailwind v4 note:** Use bracket notation for non-standard opacity values: `bg-white/[0.04]` not `bg-white/4`.

---

## Files Modified (no new files)

| File | What changes |
|---|---|
| `src/lib/weather.ts` | Rename + retype `getWeatherEmoji` → `getWeatherIcon`, returns `LucideIcon` |
| `src/components/ui/weather-badge.tsx` | Render `LucideIcon` component |
| `src/app/page.tsx` | Landing page feature icons (string → LucideIcon) |
| `src/app/[locale]/trips/page.tsx` | Countdown + stat row + inline emojis |
| `src/app/[locale]/trips/[tripId]/page.tsx` | Countdown + activity feed + itinerary category ternary + inline emojis |
| `src/app/[locale]/trips/[tripId]/itinerary/page.tsx` | CATEGORIES map + inline emojis |
| `src/app/[locale]/trips/[tripId]/accommodations/page.tsx` | Inline emojis |
| `src/app/[locale]/trips/[tripId]/expenses/page.tsx` | CATEGORIES map + inline emojis |
| `src/app/[locale]/trips/[tripId]/packing/page.tsx` | CATEGORY_EMOJI map + item display + inline emojis |
| `src/app/[locale]/trips/[tripId]/stages/page.tsx` | `getAccommodationEmoji` + inline emojis |
| `src/app/[locale]/trips/[tripId]/polls/page.tsx` | Empty state emoji |

---

## Task 1: Weather — refactor `getWeatherEmoji` to return `LucideIcon`

**Files:**
- Modify: `src/lib/weather.ts:20-30`
- Modify: `src/components/ui/weather-badge.tsx`

- [ ] **Step 1: Update `src/lib/weather.ts`**

Add imports at the top of the file (after the existing interfaces/exports) and rename + retype the function. The rest of the file (geocoding, caching, `getWeatherCondition`, `getWeatherForTrip`) is unchanged.

Replace the existing `getWeatherEmoji` function (lines 19–30) with:

```ts
import type { LucideIcon } from "lucide-react";
import {
  Sun, CloudSun, CloudFog, CloudDrizzle, CloudRain,
  Snowflake, CloudLightning, Thermometer,
} from "lucide-react";

// WMO weather code to icon mapping
export function getWeatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 55) return CloudDrizzle;
  if (code <= 65) return CloudRain;
  if (code <= 75) return Snowflake;
  if (code <= 82) return CloudRain;
  if (code <= 99) return CloudLightning;
  return Thermometer;
}
```

Add these imports at the top of the file, before the `WeatherDay` interface.

- [ ] **Step 2: Update `src/components/ui/weather-badge.tsx`**

Replace the entire file content:

```tsx
import { getWeatherIcon } from "@/lib/weather";

interface WeatherBadgeProps {
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  variant?: "compact" | "expanded";
}

export function WeatherBadge({
  temperatureMax,
  temperatureMin,
  weatherCode,
  variant = "compact",
}: WeatherBadgeProps) {
  const Icon = getWeatherIcon(weatherCode);
  const max = Math.round(temperatureMax);
  const min = Math.round(temperatureMin);

  if (variant === "compact") {
    return (
      <div className="text-[10px] text-gray-400 mt-auto pt-1 leading-none flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" />
        {max}°/{min}°
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-400 flex items-center gap-1">
      <Icon className="w-4 h-4 shrink-0" />
      <span>{max}° / {min}°</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/weather.ts src/components/ui/weather-badge.tsx
git commit -m "feat: replace weather emoji with lucide icons"
```

---

## Task 2: Landing page feature icons

**Files:**
- Modify: `src/app/page.tsx:76-112`

The features grid at line 76 stores `icon: string` (emoji). Change it to `icon: LucideIcon` and update the render.

- [ ] **Step 1: Add imports to `src/app/page.tsx`**

At the top of the file, add after the existing imports:

```tsx
import { MapPin, Wallet, Backpack, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
```

- [ ] **Step 2: Update the features array and render**

Find the features grid section (around line 76). Replace the features array and its render:

```tsx
{[
  {
    title: "ITINERARY",
    desc: "Build your trip timeline together. Add activities, restaurants, and experiences.",
    icon: MapPin,
    color: "from-orange-500 to-red-500"
  },
  {
    title: "EXPENSES",
    desc: "Track spending and split costs fairly. Know who owes what instantly.",
    icon: Wallet,
    color: "from-emerald-500 to-purple-500"
  },
  {
    title: "PACKING",
    desc: "Coordinate what to bring. Claim items so nothing gets forgotten.",
    icon: Backpack,
    color: "from-yellow-500 to-orange-500"
  },
  {
    title: "POLLS",
    desc: "Make group decisions easy. Vote on destinations, activities, and more.",
    icon: Vote,
    color: "from-cyan-500 to-blue-500"
  }
].map((feature, i) => (
  <div
    key={i}
    className="group p-8 bg-white/5 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all hover:transform hover:-translate-y-2 hover:shadow-2xl"
    style={{ animationDelay: `${i * 100}ms` }}
  >
    <div className="mb-4 group-hover:scale-125 transition-transform">
      <feature.icon className="w-12 h-12" />
    </div>
    <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
    <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
    <div className={`mt-4 h-1 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r ${feature.color}`} />
  </div>
))}
```

Note: The `feature.icon` type inference requires the array to be typed with `LucideIcon`. If TypeScript complains, add an explicit type annotation: `] as { title: string; desc: string; icon: LucideIcon; color: string }[]`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace landing page emoji icons with lucide"
```

---

## Task 3: Trips list page

**Files:**
- Modify: `src/app/[locale]/trips/page.tsx:91-114, 236-237, 241-243, 246-252, 261-265, 211-215`

- [ ] **Step 1: Add imports**

Near the top of the file (after existing imports), add:

```tsx
import type { LucideIcon } from "lucide-react";
import { MapPin, Calendar, Users, Wallet, Map, Timer, PartyPopper, Plane, Flag, Check } from "lucide-react";
```

- [ ] **Step 2: Update `getCountdown` return type and emoji fields**

Find the `getCountdown` function (around line 91). Change all `emoji:` fields to `icon:` with the corresponding Lucide component:

```ts
function getCountdown(startDate: string | null, endDate: string | null): { text: string; color: string; icon: LucideIcon } | null {
  if (!startDate) return null;
  // ... (date calculation logic unchanged) ...
  if (daysUntilStart > 0) {
    return { text: t("trips.countdown.daysLeft", { count: daysUntilStart }), color: daysUntilStart <= 7 ? "text-amber-400" : "text-teal-400", icon: Timer };
  }
  if (daysUntilStart === 0) return { text: t("trips.countdown.startsToday"), color: "text-green-400", icon: PartyPopper };
  if (daysUntilEnd > 0) return { text: t("trips.countdown.daysOngoing", { current: currentDay, total: totalDays }), color: "text-green-400", icon: Plane };
  if (daysUntilEnd === 0) return { text: t("trips.countdown.endsToday"), color: "text-amber-400", icon: Flag };
  return { text: t("trips.countdown.daysAgo", { count: Math.abs(daysUntilEnd) }), color: "text-gray-500", icon: Check };
}
```

Only the `emoji` → `icon` fields change; all date math logic is untouched.

- [ ] **Step 3: Update countdown render site**

Find where `countdown.emoji` is rendered (around line 249):

```tsx
// before:
<p className={`flex items-center gap-2 text-sm font-bold ${countdown.color}`}>
  {countdown.emoji} {countdown.text}
</p>

// after:
<p className={`flex items-center gap-2 text-sm font-bold ${countdown.color}`}>
  <countdown.icon className="w-4 h-4 shrink-0" />
  {countdown.text}
</p>
```

- [ ] **Step 4: Replace inline emojis in trip card**

Find and replace the destination and date lines (around lines 236–244):

```tsx
// before:
<p className="text-gray-400 flex items-center gap-2 mb-1">
  📍 {trip.destination}
</p>
{formatDateRange(trip.startDate, trip.endDate) && (
  <p className="text-teal-400 flex items-center gap-2 text-sm font-semibold">
    📅 {formatDateRange(trip.startDate, trip.endDate)}
  </p>
)}

// after:
<p className="text-gray-400 flex items-center gap-2 mb-1">
  <MapPin className="w-3.5 h-3.5 shrink-0" /> {trip.destination}
</p>
{formatDateRange(trip.startDate, trip.endDate) && (
  <p className="text-teal-400 flex items-center gap-2 text-sm font-semibold">
    <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDateRange(trip.startDate, trip.endDate)}
  </p>
)}
```

Find and replace the stats row (around line 261–265):

```tsx
// before:
<span>👥 <span className="text-gray-400">{trip._count.members}</span></span>
<span>📅 <span className="text-gray-400">{trip._count.itinerary}</span></span>
<span>💰 <span className="text-gray-400">{trip._count.expenses}</span></span>

// after:
<span className="flex items-center gap-1"><Users className="w-3 h-3" /> <span className="text-gray-400">{trip._count.members}</span></span>
<span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> <span className="text-gray-400">{trip._count.itinerary}</span></span>
<span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> <span className="text-gray-400">{trip._count.expenses}</span></span>
```

- [ ] **Step 5: Replace empty state emoji**

Find the empty state section (around line 211–215):

```tsx
// before:
<div className="text-6xl mb-6">🗺️</div>

// after:
<Map className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/page.tsx
git commit -m "feat: replace trips page emojis with lucide icons"
```

---

## Task 4: Trip detail page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/page.tsx`

This is the largest file. Use grep to find each section before editing.

- [ ] **Step 1: Add imports**

```bash
grep -n "^import" src/app/[locale]/trips/[tripId]/page.tsx | head -20
```

Add near the top after existing imports:

```tsx
import type { LucideIcon } from "lucide-react";
import {
  MapPin, Calendar, Wallet, Vote, Plane, Timer, PartyPopper, Flag, Check,
  UtensilsCrossed, Hotel, Target, TrainFront,
} from "lucide-react";
```

- [ ] **Step 2: Update `getCountdown` (same pattern as Task 3)**

```bash
grep -n "emoji" src/app/[locale]/trips/[tripId]/page.tsx
```

Find the countdown function (around line 426) and update identically to Task 3 Step 2:
- Return type: `{ text: string; color: string; icon: LucideIcon } | null`
- `emoji: "⏳"` → `icon: Timer`
- `emoji: "🎉"` → `icon: PartyPopper`
- `emoji: "✈️"` → `icon: Plane`
- `emoji: "🏁"` → `icon: Flag`
- `emoji: "✓"` → `icon: Check`

- [ ] **Step 3: Update countdown render site in trip detail**

```bash
grep -n "countdown.emoji\|countdown\.icon" src/app/[locale]/trips/[tripId]/page.tsx
```

Replace `{countdown.emoji}` with `<countdown.icon className="w-4 h-4 shrink-0" />` at the render site.

- [ ] **Step 4: Update activity feed icon function**

```bash
grep -n "case.*itinerary\|case.*expense\|case.*poll\|case.*trip" src/app/[locale]/trips/[tripId]/page.tsx
```

Find the function that returns emoji strings for activity feed types (around lines 459–465). It is a switch/if-else returning emoji strings. Replace with a `LucideIcon` lookup:

```tsx
// before (approximate):
function getActivityIcon(type: string): string {
  switch (type) {
    case "itinerary": return "📅";
    case "expense": return "💰";
    case "poll": return "🗳️";
    case "trip": return "✈️";
    default: return "📅";
  }
}

// after:
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  itinerary: Calendar,
  expense: Wallet,
  poll: Vote,
  trip: Plane,
};

function getActivityIcon(type: string): LucideIcon {
  return ACTIVITY_ICONS[type] ?? Calendar;
}
```

Then find the render site for `getActivityIcon` and update from `{getActivityIcon(type)}` to:
```tsx
const ActivityIcon = getActivityIcon(item.type /* or activity.type */);
// render: <ActivityIcon className="w-4 h-4 shrink-0" />
```

- [ ] **Step 5: Replace itinerary category inline ternary**

```bash
grep -n "meal.*🍽️\|🍽️.*meal" src/app/[locale]/trips/[tripId]/page.tsx
```

Find the inline ternary around line 823:

```ts
// before:
const emoji = item.category === "meal" ? "🍽️"
  : item.category === "travel" ? "✈️"
  : item.category === "accommodation" ? "🏨"
  : "📅";
// <span>{emoji}</span>

// after (place ITINERARY_CATEGORY_ICONS near the top of the component, before the return):
const ITINERARY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  meal: UtensilsCrossed,
  travel: Plane,
  accommodation: Hotel,
  activity: Target,
};
// at the render site:
const CategoryIcon = ITINERARY_CATEGORY_ICONS[item.category] ?? Calendar;
// <CategoryIcon className="w-4 h-4 shrink-0" />
```

- [ ] **Step 6: Replace inline `📍` and `🚄` emojis**

```bash
grep -n "📍\|🚄" src/app/[locale]/trips/[tripId]/page.tsx
```

For each occurrence:
- `📍 {destination}` or `📍 {location}` → `<MapPin className="w-3.5 h-3.5 shrink-0" /> {destination/location}`
- `<span>🚄</span>` → `<TrainFront className="w-4 h-4 shrink-0" />`

Each of these is inside a `flex items-center gap-2` container — the icon slots in place of the emoji character with no layout changes needed.

- [ ] **Step 7: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/page.tsx
git commit -m "feat: replace trip detail page emojis with lucide icons"
```

---

## Task 5: Itinerary page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import type { LucideIcon } from "lucide-react";
import { Target, UtensilsCrossed, MapPin, Calendar } from "lucide-react";
```

- [ ] **Step 2: Update CATEGORIES array**

Find the CATEGORIES array (around line 53):

```tsx
// before:
const CATEGORIES = [
  { value: "activity", label: t("itinerary.categories.activity"), emoji: "🎯" },
  { value: "meal",     label: t("itinerary.categories.meal"),     emoji: "🍽️" },
  { value: "other",    label: t("itinerary.categories.other"),    emoji: "📌" },
];

// after:
const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "activity", label: t("itinerary.categories.activity"), icon: Target },
  { value: "meal",     label: t("itinerary.categories.meal"),     icon: UtensilsCrossed },
  { value: "other",    label: t("itinerary.categories.other"),    icon: MapPin },
];
```

- [ ] **Step 3: Update `getCategoryEmoji` helper**

```bash
grep -n "getCategoryEmoji" src/app/[locale]/trips/[tripId]/itinerary/page.tsx
```

Rename and retype:

```tsx
// before:
function getCategoryEmoji(category: string) {
  return cat ? cat.emoji : "📌";
}

// after:
function getCategoryIcon(category: string): LucideIcon {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.icon : MapPin;
}
```

- [ ] **Step 4: Update all `cat.emoji` and `getCategoryEmoji` usages**

```bash
grep -n "cat\.emoji\|getCategoryEmoji\|getCategoryIcon" src/app/[locale]/trips/[tripId]/itinerary/page.tsx
```

There are three types of usages:

**In `<option>` text** (in a `<Select>` component — cannot use React nodes): Remove `{cat.emoji}` entirely, leave only `{cat.label}`:
```tsx
// before: <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
// after:  <option key={cat.value} value={cat.value}>{cat.label}</option>
```

**In clickable filter buttons/tabs** (not inside `<option>`): Replace with icon:
```tsx
// before: {cat.emoji} {cat.label}
// after:  <cat.icon className="w-3.5 h-3.5 shrink-0" /> {cat.label}
```

**In item display cards** (calling `getCategoryEmoji`): Replace with `getCategoryIcon` and render:
```tsx
// before: <span>{getCategoryEmoji(item.category)}</span>
// after:  (() => { const Icon = getCategoryIcon(item.category); return <Icon className="w-4 h-4 shrink-0" />; })()
```

Or extract to a variable above the JSX:
```tsx
const CategoryIcon = getCategoryIcon(item.category);
// then: <CategoryIcon className="w-4 h-4 shrink-0" />
```

- [ ] **Step 5: Replace inline emojis**

```bash
grep -n "📍\|📅\|🗺️" src/app/[locale]/trips/[tripId]/itinerary/page.tsx
```

- `📍 {item.location}` → `<MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}`
- Empty state `📅` (around line 371): `<div className="text-6xl mb-6">📅</div>` → `<Calendar className="w-16 h-16 mb-6 text-gray-600 mx-auto" />`

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/itinerary/page.tsx
git commit -m "feat: replace itinerary page emojis with lucide icons"
```

---

## Task 6: Accommodations page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/accommodations/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Hotel, MapPin, Wallet } from "lucide-react";
```

- [ ] **Step 2: Replace all inline emojis**

```bash
grep -n "🏨\|📍\|💰" src/app/[locale]/trips/[tripId]/accommodations/page.tsx
```

Expected occurrences (from prior audit):
- Line 321: `<div className="text-6xl mb-6">🏨</div>` (empty state) → `<Hotel className="w-16 h-16 mb-6 text-gray-600 mx-auto" />`
- Line 343: `<div className="text-2xl font-black text-teal-400">🏨</div>` (item icon) → `<Hotel className="w-7 h-7 text-teal-400 shrink-0" />`
- Line 407: `📍 {item.location}` → `<MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}`
- Line 423: `💰 {item.cost...}` → `<Wallet className="w-3.5 h-3.5 shrink-0" /> {item.cost...}`
- Line 721: `🏨 {t("itinerary.categories.accommodation")}` → `<Hotel className="w-3.5 h-3.5 shrink-0" /> {t(...)}`
- Line 761: `📍 {selectedItem.location} ↗` → `<MapPin className="w-3.5 h-3.5 shrink-0" /> {selectedItem.location} ↗`

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/accommodations/page.tsx
git commit -m "feat: replace accommodations page emojis with lucide icons"
```

---

## Task 7: Expenses page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/expenses/page.tsx:85-91, 426-429, 527-530`

- [ ] **Step 1: Add imports**

```tsx
import type { LucideIcon } from "lucide-react";
import { UtensilsCrossed, Hotel, Car, Target, MapPin, Wallet } from "lucide-react";
```

- [ ] **Step 2: Update CATEGORIES array**

Find the CATEGORIES array (around line 85):

```tsx
// before:
const CATEGORIES = [
  { value: "food",          label: t("expenses.categories.food"),          emoji: "🍽️" },
  { value: "accommodation", label: t("expenses.categories.accommodation"), emoji: "🏨" },
  { value: "transport",     label: t("expenses.categories.transport"),     emoji: "🚗" },
  { value: "activity",      label: t("expenses.categories.activity"),      emoji: "🎯" },
  { value: "other",         label: t("expenses.categories.other"),         emoji: "📌" },
];

// after:
const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "food",          label: t("expenses.categories.food"),          icon: UtensilsCrossed },
  { value: "accommodation", label: t("expenses.categories.accommodation"), icon: Hotel },
  { value: "transport",     label: t("expenses.categories.transport"),     icon: Car },
  { value: "activity",      label: t("expenses.categories.activity"),      icon: Target },
  { value: "other",         label: t("expenses.categories.other"),         icon: MapPin },
];
```

- [ ] **Step 3: Update `getCategoryEmoji` helper**

Find around line 426:

```tsx
// before:
function getCategoryEmoji(category: string) {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.emoji : "📌";
}

// after:
function getCategoryIcon(category: string): LucideIcon {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.icon : MapPin;
}
```

- [ ] **Step 4: Update all usages**

```bash
grep -n "getCategoryEmoji\|cat\.emoji" src/app/[locale]/trips/[tripId]/expenses/page.tsx
```

**In `<option>` text** (inside `<Select>` around line 738): Remove `{cat.emoji}`:
```tsx
// before: <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
// after:  <option key={cat.value} value={cat.value}>{cat.label}</option>
```

**In expense card display** (around line 528): Replace emoji div with icon:
```tsx
// before:
<div className="text-3xl">
  {getCategoryEmoji(expense.category)}
</div>

// after:
(() => {
  const Icon = getCategoryIcon(expense.category);
  return <Icon className="w-7 h-7 shrink-0 text-gray-400" />;
})()
```

Or extract `const Icon = getCategoryIcon(expense.category)` before the JSX and use `<Icon .../>`.

- [ ] **Step 5: Replace empty state emoji**

Around line 496:
```tsx
// before: <div className="text-6xl mb-6">💰</div>
// after:  <Wallet className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/expenses/page.tsx
git commit -m "feat: replace expenses page emojis with lucide icons"
```

---

## Task 8: Packing page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx:53-61, 129-148, 358-360`

This is the most complex task because packing items can have a user-provided `item.categoryEmoji` string (from DB). When present, render it as-is. When absent, render the Lucide icon.

- [ ] **Step 1: Add imports**

```tsx
import type { LucideIcon } from "lucide-react";
import {
  Shirt, Droplets, Plug, FileText, Tent, CookingPot, Wrench, Flashlight,
  Footprints, Compass, ShieldCheck, Waves, Anchor, Car, Cookie, Mountain,
  Briefcase, Package, Lock, Pencil, Backpack,
} from "lucide-react";
```

- [ ] **Step 2: Replace `CATEGORY_EMOJI` map with `CATEGORY_ICON`**

Find the `CATEGORY_EMOJI` const (around line 53):

```tsx
// before:
const CATEGORY_EMOJI: Record<string, string> = {
  clothing: "👕", toiletries: "🧴", electronics: "🔌", documents: "📄",
  shelter: "⛺", cooking: "🍳", tools: "🔧", lighting: "🔦",
  gear: "🥾", navigation: "🧭", safety: "⛑️",
  beach: "🏖️", watersports: "🤿",
  car: "🚗", snacks: "🍿",
  skigear: "⛷️", formal: "👔",
  other: "📦",
};

// after:
const CATEGORY_ICON: Record<string, LucideIcon> = {
  clothing: Shirt, toiletries: Droplets, electronics: Plug, documents: FileText,
  shelter: Tent, cooking: CookingPot, tools: Wrench, lighting: Flashlight,
  gear: Footprints, navigation: Compass, safety: ShieldCheck,
  beach: Waves, watersports: Anchor,
  car: Car, snacks: Cookie,
  skigear: Mountain, formal: Briefcase,
  other: Package,
};
```

- [ ] **Step 3: Update references from `CATEGORY_EMOJI` to `CATEGORY_ICON`**

```bash
grep -n "CATEGORY_EMOJI\|allKnownKeys" src/app/[locale]/trips/[tripId]/packing/page.tsx
```

Update the `allKnownKeys` line and the `getCategoryEmoji` helper (around line 128 and 358):

```tsx
// before:
const allKnownKeys = new Set(Object.keys(CATEGORY_EMOJI));
// ...
function getCategoryEmoji(category: string) {
  return CATEGORY_EMOJI[category] || customCategoryMap.get(category) || "📦";
}

// after:
const allKnownKeys = new Set(Object.keys(CATEGORY_ICON));
// ...
function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] || Package;
}
```

Note: `customCategoryMap` continues to store emoji strings (user data from DB). It is used only in the user-emoji fallback below.

- [ ] **Step 4: Update CATEGORIES array build**

Find around line 138–149:

```tsx
// before:
const CATEGORIES = [
  ...uniquePredefinedKeys.map((key) => ({
    value: key,
    label: t(`packing.categories.${key}`),
    emoji: CATEGORY_EMOJI[key] || "📦",
  })),
  ...[...customCategoryMap.entries()].map(([key, emoji]) => ({
    value: key,
    label: key,
    emoji,
  })),
];

// after:
const CATEGORIES = [
  ...uniquePredefinedKeys.map((key) => ({
    value: key,
    label: t(`packing.categories.${key}`),
    icon: CATEGORY_ICON[key] || Package,
  })),
  ...[...customCategoryMap.entries()].map(([key, emoji]) => ({
    value: key,
    label: key,
    emoji, // keep emoji string for user-created custom categories
    icon: Package as LucideIcon, // fallback for type safety
  })),
];
```

- [ ] **Step 5: Update item display — user emoji fallback pattern**

Find all places where category icons/emojis are rendered on item rows (around lines 459 and 588). Currently: `{item.categoryEmoji || getCategoryEmoji(item.category)}`.

Replace with:

```tsx
{item.categoryEmoji ? (
  <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
) : (() => {
  const Icon = getCategoryIcon(item.category);
  return <Icon className="w-6 h-6 shrink-0" />;
})()}
```

This preserves user-defined emoji and shows a Lucide icon otherwise.

- [ ] **Step 6: Update `<option>` text and other usages**

```bash
grep -n "cat\.emoji\|getCategoryEmoji\|CATEGORY_EMOJI" src/app/[locale]/trips/[tripId]/packing/page.tsx
```

**In `<Select><option>` text** (around line 768): Remove `{cat.emoji}`:
```tsx
// before: <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
// after:  <option key={cat.value} value={cat.value}>{cat.label}</option>
```

- [ ] **Step 7: Replace other inline emojis**

```bash
grep -n "🔒\|✏️\|🎒" src/app/[locale]/trips/[tripId]/packing/page.tsx
```

- `🔒` (private list badge, line ~521): `<span className="text-sm font-normal text-yellow-400" title={t("packing.privateList")}>🔒</span>` → `<Lock className="w-4 h-4 text-yellow-400 shrink-0" title={t("packing.privateList")} />`
- `🔒` (modal label, line ~666): `🔒 {t("packing.private")}` → `<Lock className="w-4 h-4 shrink-0" /> {t("packing.private")}`
- `✏️` (custom category button, line ~776): `✏️ {t("packing.customCategory")}` → `<Pencil className="w-3.5 h-3.5 shrink-0" /> {t("packing.customCategory")}`
- `🎒` (empty state, line ~499): `<div className="text-6xl mb-6">🎒</div>` → `<Backpack className="w-16 h-16 mb-6 text-gray-600 mx-auto" />`

- [ ] **Step 8: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors. Pay particular attention to the mixed `CATEGORIES` array type (some entries have `icon: LucideIcon`, user-created entries have both `emoji` and `icon`).

- [ ] **Step 9: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/packing/page.tsx
git commit -m "feat: replace packing page emojis with lucide icons"
```

---

## Task 9: Stages page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/stages/page.tsx:55-64, 313, 386-388, 396-397, 403-420`

- [ ] **Step 1: Add imports**

```tsx
import type { LucideIcon } from "lucide-react";
import { Home, Tent, Hotel, MoonStar, Bike, Footprints, MapPin, Clock, Route, Mountain, FolderOpen } from "lucide-react";
```

- [ ] **Step 2: Replace `getAccommodationEmoji` with `getAccommodationIcon`**

Find the function at line 55:

```tsx
// before:
function getAccommodationEmoji(accommodation: string | null): string {
  switch (accommodation) {
    case "hut": return "🏠";
    case "campsite": return "⛺";
    case "hotel": return "🏨";
    case "bivouac": return "🪨";
    case "none": return "—";
    default: return "";
  }
}

// after:
function getAccommodationIcon(accommodation: string | null): LucideIcon | null {
  switch (accommodation) {
    case "hut": return Home;
    case "campsite": return Tent;
    case "hotel": return Hotel;
    case "bivouac": return MoonStar;
    default: return null;
  }
}
```

- [ ] **Step 3: Update `getAccommodationEmoji` call sites**

```bash
grep -n "getAccommodationEmoji" src/app/[locale]/trips/[tripId]/stages/page.tsx
```

There are three usages (two in `<option>` text, one in the accommodation badge):

**In `<option>` text** (lines 576 and 679): Remove the emoji prefix:
```tsx
// before: <option key={a} value={a}>{getAccommodationEmoji(a)} {t(`stages.accommodations.${a}`)}</option>
// after:  <option key={a} value={a}>{t(`stages.accommodations.${a}`)}</option>
```

**In the accommodation badge** (around line 386–388):
```tsx
// before:
{stage.accommodation && stage.accommodation !== "none" && (
  <span className="px-2 py-0.5 text-xs bg-white/10 border border-white/20">
    {getAccommodationEmoji(stage.accommodation)} {t(`stages.accommodations.${stage.accommodation}`)}
  </span>
)}

// after:
{stage.accommodation && stage.accommodation !== "none" && (() => {
  const AccomIcon = getAccommodationIcon(stage.accommodation);
  return (
    <span className="px-2 py-0.5 text-xs bg-white/10 border border-white/20 flex items-center gap-1">
      {AccomIcon && <AccomIcon className="w-3 h-3 shrink-0" />}
      {t(`stages.accommodations.${stage.accommodation}`)}
    </span>
  );
})()}
```

- [ ] **Step 4: Replace page header emojis**

Find around line 313:

```tsx
// before:
{tripType === "cycling" ? "🚴" : "🥾"}{" "}

// after:
{tripType === "cycling"
  ? <Bike className="w-10 h-10 md:w-14 md:h-14 inline-block shrink-0" />
  : <Footprints className="w-10 h-10 md:w-14 md:h-14 inline-block shrink-0" />
}{" "}
```

- [ ] **Step 5: Replace inline stat emojis and location pin**

```bash
grep -n "📍\|⏱️\|🛤️\|📂\|🏔️" src/app/[locale]/trips/[tripId]/stages/page.tsx
```

- `📍 {stage.startLocation}` → `<MapPin className="w-3.5 h-3.5 shrink-0" /> {stage.startLocation}`
- `⏱️ {stage.duration}` → `<Clock className="w-3.5 h-3.5 shrink-0" /> {stage.duration}`
- `🛤️ {stage.distance}` → `<Route className="w-3.5 h-3.5 shrink-0" /> {stage.distance}`
- `📂 {selectedGpxName}` and `📂 {t("stages.importGpx")}` etc. → `<FolderOpen className="w-4 h-4 shrink-0 inline-block" /> {selectedGpxName}` etc.
- `🏔️` empty state → `<Mountain className="w-16 h-16 mb-6 text-gray-600 mx-auto" />`

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/stages/page.tsx
git commit -m "feat: replace stages page emojis with lucide icons"
```

---

## Task 10: Polls page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/polls/page.tsx:290`

- [ ] **Step 1: Add import and replace empty state emoji**

Add import:
```tsx
import { Vote } from "lucide-react";
```

Find line 290:
```tsx
// before: <div className="text-6xl mb-6">🗳️</div>
// after:  <Vote className="w-16 h-16 mb-6 text-gray-600 mx-auto" />
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Final full build check**

```bash
cd /home/tobias/trippla && npm run build
```

Expected: build succeeds with no TypeScript errors. (Ignore Next.js lint warnings about `next/lint` — pre-existing issue.)

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/polls/page.tsx
git commit -m "feat: replace polls page empty state emoji with lucide icon"
```

---

## Verification Checklist

After all tasks are complete, run a final emoji audit:

```bash
# Check for remaining decorative emoji in JSX files
grep -rn "🗺️\|📍\|📅\|💰\|👥\|⏳\|🎉\|🏁\|🍽️\|🏨\|🚗\|🎯\|📌\|🗳️\|🎒\|🥾\|🚴\|⏱️\|🛤️\|🏔️\|📂\|🔒\|✏️\|☀️\|⛅\|🌫️\|❄️\|⛈️\|🌡️\|🚄\|🏠\|⛺\|🪨\|✓" src/app src/components src/lib
```

Expected: remaining hits should only be in:
- `item.categoryEmoji` render (user data fallback — intentional)
- String values inside `customCategoryMap` (user data — intentional)
- Comments or non-JSX strings (acceptable)
