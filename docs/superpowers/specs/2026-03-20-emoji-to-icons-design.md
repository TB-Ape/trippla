# Emoji to Lucide Icons — Design Spec
**Date:** 2026-03-20
**Scope:** Replace all emoji usage site-wide with lucide-react icons

---

## Overview

Replace all emoji strings used as UI decoration with inline Lucide icons from the already-installed `lucide-react` package. Approach A: eliminate emoji at the data layer (function return types, data arrays) rather than wrapping it at the display layer.

---

## Goals

- Zero decorative emoji strings rendered in JSX (inline or from functions)
- `getWeatherEmoji` refactored to return a `LucideIcon` component
- Countdown and activity-feed emoji fields replaced with `LucideIcon` values
- Category maps (packing, expenses, itinerary) use `LucideIcon` instead of emoji strings
- Landing page feature icons replaced with Lucide icons

## Out of Scope

- User-facing packing category emoji input (`customEmoji` field, `item.categoryEmoji` from DB) — kept as-is
- Auth pages, legal pages
- `<option>` text in native `<select>` elements — cannot contain React nodes; emoji removed from option text entirely (label only, no icon)

---

## Icon Mapping

### Weather icons (`src/lib/weather.ts`)

| Weather code | Current emoji | Lucide icon |
|---|---|---|
| 0 (clear) | ☀️ | `Sun` |
| 1–3 (partly cloudy) | ⛅ | `CloudSun` |
| 4–48 (fog) | 🌫️ | `CloudFog` |
| 49–55 (drizzle) | 🌦️ | `CloudDrizzle` |
| 56–65 (rain) | 🌧️ | `CloudRain` |
| 66–75 (snow) | ❄️ | `Snowflake` |
| 76–82 (showers) | 🌧️ | `CloudRain` |
| 83–99 (thunderstorm) | ⛈️ | `CloudLightning` |
| fallback | 🌡️ | `Thermometer` |

### Countdown icons (trips page + trip detail page)

| State | Current emoji | Lucide icon |
|---|---|---|
| Days until start | ⏳ | `Timer` |
| Starts today | 🎉 | `PartyPopper` |
| Ongoing | ✈️ | `Plane` |
| Ends today | 🏁 | `Flag` |
| Past | ✓ | `Check` |

### Activity feed icons (trip detail page)

| Activity type | Current emoji | Lucide icon |
|---|---|---|
| itinerary | 📅 | `Calendar` |
| expense | 💰 | `Wallet` |
| poll | 🗳️ | `Vote` |
| trip | ✈️ | `Plane` |

### Itinerary categories (itinerary page + trip detail inline rendering)

| Category | Current emoji | Lucide icon |
|---|---|---|
| activity | 🎯 | `Target` |
| meal | 🍽️ | `UtensilsCrossed` |
| travel | ✈️ | `Plane` |
| accommodation | 🏨 | `Hotel` |
| other / default | 📌 | `MapPin` |

### Expense categories (expenses page)

| Category | Current emoji | Lucide icon |
|---|---|---|
| food | 🍽️ | `UtensilsCrossed` |
| accommodation | 🏨 | `Hotel` |
| transport | 🚗 | `Car` |
| activity | 🎯 | `Target` |
| other | 📌 | `MapPin` |

### Packing categories (packing page `CATEGORY_EMOJI` map)

| Category | Current emoji | Lucide icon |
|---|---|---|
| clothing | 👕 | `Shirt` |
| toiletries | 🧴 | `Droplets` |
| electronics | 🔌 | `Plug` |
| documents | 📄 | `FileText` |
| shelter | ⛺ | `Tent` |
| cooking | 🍳 | `CookingPot` |
| tools | 🔧 | `Wrench` |
| lighting | 🔦 | `Flashlight` |
| gear | 🥾 | `Footprints` |
| navigation | 🧭 | `Compass` |
| safety | ⛑️ | `ShieldCheck` |
| beach | 🏖️ | `Waves` |
| watersports | 🤿 | `Anchor` |
| car | 🚗 | `Car` |
| snacks | 🍿 | `Cookie` |
| skigear | ⛷️ | `Mountain` |
| formal | 👔 | `Briefcase` |
| other | 📦 | `Package` |

### Stage accommodation icons (stages page)

| Accommodation | Current emoji | Lucide icon |
|---|---|---|
| hut | 🏠 | `Home` |
| campsite | ⛺ | `Tent` |
| hotel | 🏨 | `Hotel` |
| bivouac | 🪨 | `MoonStar` |
| none | — | — (no icon) |

### Miscellaneous inline emojis

| Location | Emoji | Lucide icon |
|---|---|---|
| Trips page — destination | 📍 | `MapPin` |
| Trips page — date range | 📅 | `Calendar` |
| Trips page — stats: members | 👥 | `Users` |
| Trips page — stats: itinerary | 📅 | `Calendar` |
| Trips page — stats: expenses | 💰 | `Wallet` |
| Trips page — empty state | 🗺️ | `Map` |
| Trip detail — location pins | 📍 | `MapPin` |
| Trip detail — transport row | 🚄 | `TrainFront` |
| Itinerary — location pin | 📍 | `MapPin` |
| Itinerary — empty state | 📅 | `Calendar` |
| Accommodations — hotel icon | 🏨 | `Hotel` |
| Accommodations — location | 📍 | `MapPin` |
| Accommodations — cost | 💰 | `Wallet` |
| Packing — private lock (list name badge + modal label) | 🔒 | `Lock` |
| Packing — custom category button | ✏️ | `Pencil` |
| Packing — empty state | 🎒 | `Backpack` |
| Stages — page header (cycling) | 🚴 | `Bike` |
| Stages — page header (hiking) | 🥾 | `Footprints` |
| Stages — location | 📍 | `MapPin` |
| Stages — duration | ⏱️ | `Clock` |
| Stages — distance | 🛤️ | `Route` |
| Stages — empty state | 🏔️ | `Mountain` |
| Stages — GPX file indicator | 📂 | `FolderOpen` |
| Polls — empty state | 🗳️ | `Vote` |
| Expenses — empty state | 💰 | `Wallet` |
| Landing — itinerary feature | 📍 | `MapPin` |
| Landing — expenses feature | 💰 | `Wallet` |
| Landing — packing feature | 🎒 | `Backpack` |
| Landing — polls feature | 🗳️ | `Vote` |

---

## Component Changes

### 1. `src/lib/weather.ts`

Rename `getWeatherEmoji` to `getWeatherIcon`. Change return type from `string` to `LucideIcon`.

```ts
import type { LucideIcon } from "lucide-react";
import { Sun, CloudSun, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning, Thermometer } from "lucide-react";

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

### 2. `src/components/ui/weather-badge.tsx`

Update import and render:

```tsx
import { getWeatherIcon } from "@/lib/weather";

// compact variant:
const Icon = getWeatherIcon(weatherCode);
// renders: <Icon className="w-3 h-3 inline-block shrink-0" />

// expanded variant:
// <Icon className="w-4 h-4 shrink-0" />
```

Size guidance: compact → `w-3 h-3`, expanded → `w-4 h-4`. Both `stroke-current`.

### 3. Countdown functions (trips page + trip detail page)

Both files have a local `getCountdown()` function returning `{ text, color, emoji: string }`. Change `emoji` field to `icon`:

```ts
// before:
{ ..., emoji: "⏳" }

// after:
import type { LucideIcon } from "lucide-react";
import { Timer, PartyPopper, Plane, Flag, Check } from "lucide-react";
{ ..., icon: Timer }

// render site (before): {countdown.emoji} {countdown.text}
// render site (after):   <countdown.icon className="w-4 h-4 shrink-0" /> {countdown.text}
```

### 4. Category maps — general pattern

All category arrays/maps that currently store `emoji: string` switch to `icon: LucideIcon`:

```ts
// before:
{ value: "food", label: "...", emoji: "🍽️" }
function getCategoryEmoji(cat) { return CATEGORIES.find(...)?.emoji ?? "📌"; }

// after:
{ value: "food", label: "...", icon: UtensilsCrossed }
function getCategoryIcon(cat): LucideIcon { return CATEGORIES.find(...)?.icon ?? MapPin; }
```

At render sites in cards/list items:
```tsx
// before: <div className="text-3xl">{getCategoryEmoji(expense.category)}</div>
// after:  const Icon = getCategoryIcon(expense.category);
//         <Icon className="w-7 h-7 shrink-0" />
```

In `<select><option>` elements: remove `{cat.emoji}` entirely. Option shows label only.

### 5. Trip detail page — itinerary category inline ternary (`src/app/[locale]/trips/[tripId]/page.tsx`)

The trip detail page has an inline ternary (not a CATEGORIES array) that maps itinerary item categories to emojis for the activity timeline display:

```ts
// before (current code — note: missing 'activity' case):
const emoji = item.category === "meal" ? "🍽️"
  : item.category === "travel" ? "✈️"
  : item.category === "accommodation" ? "🏨"
  : "📅";
// <span>{emoji}</span>

// after:
const ITINERARY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  meal: UtensilsCrossed,
  travel: Plane,
  accommodation: Hotel,
  activity: Target,
};
const CategoryIcon = ITINERARY_CATEGORY_ICONS[item.category] ?? Calendar;
// <CategoryIcon className="w-4 h-4 shrink-0" />
```

Note: the current code lacks a `activity` case — add it while doing this refactor.

### 6. Packing page — item display with user emoji fallback

Packing items can have a user-provided `item.categoryEmoji` string (from DB). When present, render it as-is; when absent, use the Lucide icon:

```tsx
{item.categoryEmoji ? (
  <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
) : (
  (() => { const Icon = getCategoryIcon(item.category); return <Icon className="w-6 h-6 shrink-0" />; })()
)}
```

The `getCategoryEmoji` helper becomes `getCategoryIcon` returning `LucideIcon`. The `customCategoryMap` continues to store emoji strings (user data from DB) — used only in the user-emoji fallback path above.

### 6. Landing page (`src/app/page.tsx`)

The features grid stores `icon: string` today. Change to `icon: LucideIcon`:

```tsx
import { MapPin, Wallet, Backpack, Vote } from "lucide-react";

{ title: "ITINERARY", icon: MapPin, ... },
{ title: "EXPENSES",  icon: Wallet, ... },
{ title: "PACKING",   icon: Backpack, ... },
{ title: "POLLS",     icon: Vote, ... },

// render: <feature.icon className="w-12 h-12 mb-4 group-hover:scale-125 transition-transform" />
```

---

## Data Flow

No new API calls or translation keys needed. `getWeatherIcon` moves from `src/lib/weather.ts` being a pure-string utility to a React-aware export — this is acceptable since the file is already imported only by client components.

---

## Files Modified

| File | Change type |
|---|---|
| `src/lib/weather.ts` | Rename + retype `getWeatherEmoji` → `getWeatherIcon` |
| `src/components/ui/weather-badge.tsx` | Render `LucideIcon` component |
| `src/app/page.tsx` | Landing feature icons |
| `src/app/[locale]/trips/page.tsx` | Countdown + stat + inline emojis |
| `src/app/[locale]/trips/[tripId]/page.tsx` | Countdown + activity feed + itinerary category + inline emojis |
| `src/app/[locale]/trips/[tripId]/itinerary/page.tsx` | CATEGORIES map + inline emojis |
| `src/app/[locale]/trips/[tripId]/accommodations/page.tsx` | Inline emojis |
| `src/app/[locale]/trips/[tripId]/expenses/page.tsx` | CATEGORIES map + inline emojis |
| `src/app/[locale]/trips/[tripId]/packing/page.tsx` | CATEGORY_EMOJI map + item display + inline emojis |
| `src/app/[locale]/trips/[tripId]/stages/page.tsx` | `getAccommodationEmoji` + inline emojis |
| `src/app/[locale]/trips/[tripId]/polls/page.tsx` | Empty state emoji |

`transport/page.tsx` has no emoji — no changes needed.

---

## Non-Goals / Constraints

- Do not add any new icon library or dependency — lucide-react is already installed
- Do not replace emoji in `<option>` text with React nodes (not possible in native select)
- Do not touch `item.categoryEmoji` DB field or user-facing packing emoji picker
- Do not change icon sizes used in `AppHeader`, `AppNav`, `TripNav` (already done)
- Icon sizing: match visual weight of replaced emoji — typically `w-4 h-4` inline, `w-5 h-5 md:w-6 md:h-6` for larger item icons, `w-12 h-12` for landing page hero icons

---

## Success Criteria

- No emoji characters rendered as decorative UI (grep for common emoji codepoints returns zero hits in JSX)
- Weather badge shows a Lucide icon instead of ☀️/❄️ etc.
- Trip cards show MapPin/Calendar/Users/Wallet icons instead of emoji
- Category dropdowns show label-only options (no emoji prefix)
- Category icons appear in item cards/list rows
- Landing page feature cards show Lucide icons
- `npx tsc --noEmit` passes with no new errors
