# Sidebar Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace horizontal tab nav (`AppNav`, `TripNav`) with a collapsible sidebar that shows an icon strip when collapsed and an overlay with icons + labels when expanded; hamburger toggle on mobile.

**Architecture:** A shared `Sidebar` component handles all collapse/overlay/mobile logic. `AppNav` and `TripNav` become thin wrappers that define their items and delegate to `Sidebar`. Pages manage mobile-open state via a `useSidebarState` hook and pass it down. `AppHeader` gets a fixed `h-14` height and an optional mobile hamburger button.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, lucide-react, next-intl, Vitest + @testing-library/react

---

### Task 1: Create `useSidebarState` hook

**Files:**
- Create: `src/hooks/useSidebarState.ts`

**Step 1: Write the hook**

```ts
import { useState } from "react";

export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    toggle: () => setIsOpen((v) => !v),
    close: () => setIsOpen(false),
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useSidebarState.ts
git commit -m "feat: add useSidebarState hook"
```

---

### Task 2: Create `Sidebar` component with tests

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Sidebar.test.tsx`

**Step 1: Write the failing tests**

```tsx
// src/components/Sidebar.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import { Map, Calendar, Package } from "lucide-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/LocaleLink", () => ({
  LocaleLink: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const ITEMS = [
  { key: "overview", href: "/trips/1", icon: <Map size={16} />, label: "Overview" },
  { key: "itinerary", href: "/trips/1/itinerary", icon: <Calendar size={16} />, label: "Itinerary" },
  { key: "packing", href: "/trips/1/packing", icon: <Package size={16} />, label: "Packing", badge: true },
];

describe("Sidebar", () => {
  it("renders all items as links", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("marks active item with data-active=true", () => {
    render(<Sidebar items={ITEMS} current="itinerary" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    const activeLink = links.find((l) => l.getAttribute("data-active") === "true");
    expect(activeLink).toBeDefined();
    expect(activeLink).toHaveAttribute("href", "/trips/1/itinerary");
  });

  it("hides labels when collapsed (default)", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("shows labels after clicking expand toggle", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    fireEvent.click(screen.getByLabelText("Expand sidebar"));
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Itinerary")).toBeInTheDocument();
  });

  it("hides labels again after clicking collapse toggle", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    fireEvent.click(screen.getByLabelText("Expand sidebar"));
    fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("renders unseen badge dot when badge=true and item not active", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    expect(screen.getByLabelText("New activity")).toBeInTheDocument();
  });

  it("does not render badge dot on the active item", () => {
    render(<Sidebar items={ITEMS} current="packing" ariaLabel="Trip nav" />);
    expect(screen.queryByLabelText("New activity")).not.toBeInTheDocument();
  });

  it("closes expanded state on Escape key", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    fireEvent.click(screen.getByLabelText("Expand sidebar"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("moves focus to next item on ArrowDown", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    links[0].focus();
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(links[1]);
  });

  it("moves focus to previous item on ArrowUp", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    links[1].focus();
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(links[0]);
  });

  it("wraps focus to last on ArrowUp from first", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    links[0].focus();
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(links[links.length - 1]);
  });

  it("jumps to first item on Home key", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    links[2].focus();
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "Home" });
    expect(document.activeElement).toBe(links[0]);
  });

  it("jumps to last item on End key", () => {
    render(<Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" />);
    const links = screen.getAllByRole("menuitem");
    links[0].focus();
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "End" });
    expect(document.activeElement).toBe(links[links.length - 1]);
  });

  it("shows mobile sidebar content when mobileOpen=true", () => {
    render(
      <Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" mobileOpen={true} />
    );
    // Mobile sidebar always shows labels
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("calls onMobileClose when mobile backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sidebar items={ITEMS} current="overview" ariaLabel="Trip nav" mobileOpen={true} onMobileClose={onClose} />
    );
    const backdrop = container.querySelector("[data-testid='mobile-backdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run tests — expect all to fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×"
```

Expected: all 15 tests fail.

**Step 3: Implement `Sidebar` component**

```tsx
// src/components/Sidebar.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarItem = {
  key: string;
  href: string;
  icon: ReactNode;
  label: string;
  badge?: boolean;
};

interface SidebarProps {
  items: SidebarItem[];
  current: string;
  ariaLabel: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavItems({
  items,
  current,
  showLabels,
  onNavigate,
}: {
  items: SidebarItem[];
  current: string;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="menuitem"
            data-active={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={onNavigate}
            className={`relative flex items-center h-12 px-4 gap-3 transition-colors border-l-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
              isActive
                ? "border-teal-400 text-teal-400 bg-teal-400/5"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <span className="relative flex-shrink-0">
              {item.icon}
              {item.badge && !isActive && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400"
                  aria-label="New activity"
                />
              )}
            </span>
            {showLabels && (
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({
  items,
  current,
  ariaLabel,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!desktopOpen) return;
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDesktopOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDesktopOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [desktopOpen]);

  function handleNavKeyDown(e: React.KeyboardEvent) {
    const links = Array.from(
      navRef.current?.querySelectorAll('[role="menuitem"]') ?? []
    ) as HTMLElement[];
    const idx = links.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      links[(idx + 1) % links.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      links[(idx - 1 + links.length) % links.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      links[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      links[links.length - 1].focus();
    } else if (e.key === " ") {
      e.preventDefault();
      const href = (document.activeElement as HTMLAnchorElement)?.getAttribute("href");
      if (href) router.push(href);
    }
  }

  return (
    <>
      {/* Desktop sidebar — always visible as icon strip, expands to overlay */}
      <nav
        ref={navRef}
        aria-label={ariaLabel}
        onKeyDown={handleNavKeyDown}
        className={`fixed left-0 top-14 bottom-0 z-30 flex-col bg-[#0d0d0d] border-r border-white/10 transition-[width] duration-200 hidden sm:flex ${
          desktopOpen ? "w-56" : "w-14"
        }`}
      >
        <button
          onClick={() => setDesktopOpen((v) => !v)}
          className="h-12 flex items-center justify-center hover:bg-white/5 transition-colors border-b border-white/10 flex-shrink-0"
          aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={desktopOpen}
        >
          {desktopOpen ? (
            <X size={16} className="text-gray-400" />
          ) : (
            <Menu size={16} className="text-gray-400" />
          )}
        </button>
        <div className="flex-1 py-2 overflow-hidden">
          <NavItems
            items={items}
            current={current}
            showLabels={desktopOpen}
            onNavigate={() => setDesktopOpen(false)}
          />
        </div>
      </nav>

      {/* Desktop overlay backdrop */}
      {desktopOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 hidden sm:block"
          onClick={() => setDesktopOpen(false)}
        />
      )}

      {/* Mobile sidebar — overlay, controlled by parent */}
      {mobileOpen && (
        <>
          <div
            data-testid="mobile-backdrop"
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={onMobileClose}
          />
          <nav
            aria-label={ariaLabel}
            onKeyDown={handleNavKeyDown}
            className="fixed left-0 top-14 bottom-0 z-50 w-56 flex flex-col bg-[#0d0d0d] border-r border-white/10 sm:hidden"
          >
            <div className="flex-1 py-2">
              <NavItems
                items={items}
                current={current}
                showLabels={true}
                onNavigate={onMobileClose}
              />
            </div>
          </nav>
        </>
      )}
    </>
  );
}
```

**Step 4: Run tests — expect all to pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×|Tests"
```

Expected: 15 tests pass.

**Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat: add Sidebar component"
```

---

### Task 3: Update `AppHeader` — fixed height + hamburger

**Files:**
- Modify: `src/components/AppHeader.tsx`

**Step 1: Apply changes**

Two changes:
1. Add `h-14` to the `<header>` and remove `py-3 md:py-4` (use `h-full` on the inner flex div instead)
2. Add `onMobileMenuToggle?: () => void` prop and render a hamburger button on mobile when provided

```tsx
// Change the interface:
interface AppHeaderProps {
  backHref?: string;
  backLabel?: string;
  onMobileMenuToggle?: () => void;
}

// Change the function signature:
export function AppHeader({ backHref, backLabel, onMobileMenuToggle }: AppHeaderProps) {
```

```tsx
// Change the header element (remove py-3 md:py-4, add h-14):
<header className="border-b border-white/10 bg-[#0d0d0d] px-4 md:px-8 h-14">
  <div className="flex justify-between items-center h-full">
```

```tsx
// Add hamburger before the logo (inside the flex div, before the logo Link):
{onMobileMenuToggle && (
  <button
    onClick={onMobileMenuToggle}
    className="sm:hidden p-1 -ml-1 mr-2 hover:bg-white/5 transition-colors"
    aria-label="Open menu"
  >
    <Menu size={20} className="text-gray-400" />
  </button>
)}
```

Add `Menu` to the lucide-react import at the top:
```tsx
import { Settings as SettingsIcon, Menu } from "lucide-react";
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add fixed height and mobile menu toggle to AppHeader"
```

---

### Task 4: Update `AppNav` to use `Sidebar`

**Files:**
- Modify: `src/components/AppNav.tsx`

Replace the entire file content with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Plane, LayoutTemplate, Star } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarItem } from "@/components/Sidebar";

type AppSection = "trips" | "templates" | "bucketlist";

interface AppNavProps {
  current: AppSection;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppNav({ current, mobileOpen, onMobileClose }: AppNavProps) {
  const t = useTranslations();

  const items: SidebarItem[] = [
    { key: "trips", href: "/trips", icon: <Plane size={18} />, label: t("trips.yourTrips") },
    { key: "templates", href: "/templates", icon: <LayoutTemplate size={18} />, label: t("templates.browse") },
    { key: "bucketlist", href: "/bucketlist", icon: <Star size={18} />, label: t("bucketList.title") },
  ];

  return (
    <Sidebar
      items={items}
      current={current}
      ariaLabel="Main navigation"
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat: convert AppNav to use Sidebar"
```

---

### Task 5: Update `TripNav` to use `Sidebar`

**Files:**
- Modify: `src/components/TripNav.tsx`

Replace the entire file content with:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Calendar,
  BedDouble,
  Wallet,
  Plane,
  Package,
  Vote,
  Map,
} from "lucide-react";

type TripSection =
  | "overview"
  | "itinerary"
  | "accommodations"
  | "expenses"
  | "transport"
  | "packing"
  | "polls"
  | "stages";

interface TripNavProps {
  tripId: string;
  currentSection: TripSection;
  unseenSections?: Set<string>;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SECTION_ICONS: Record<TripSection, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  itinerary: <Calendar size={18} />,
  accommodations: <BedDouble size={18} />,
  expenses: <Wallet size={18} />,
  transport: <Plane size={18} />,
  packing: <Package size={18} />,
  polls: <Vote size={18} />,
  stages: <Map size={18} />,
};

const SECTION_HREFS: Record<TripSection, string> = {
  overview: "",
  itinerary: "/itinerary",
  accommodations: "/accommodations",
  expenses: "/expenses",
  transport: "/transport",
  packing: "/packing",
  polls: "/polls",
  stages: "/stages",
};

export function TripNav({
  tripId,
  currentSection,
  unseenSections,
  mobileOpen,
  onMobileClose,
}: TripNavProps) {
  const t = useTranslations("tripDetail");
  const router = useRouter();
  const locale = useLocale();

  useKeyboardShortcuts({
    o: () => router.push(`/${locale}/trips/${tripId}`),
    i: () => router.push(`/${locale}/trips/${tripId}/itinerary`),
    a: () => router.push(`/${locale}/trips/${tripId}/accommodations`),
    x: () => router.push(`/${locale}/trips/${tripId}/expenses`),
    r: () => router.push(`/${locale}/trips/${tripId}/transport`),
    p: () => router.push(`/${locale}/trips/${tripId}/packing`),
    l: () => router.push(`/${locale}/trips/${tripId}/polls`),
    s: () => router.push(`/${locale}/trips/${tripId}/stages`),
  });

  const sections: TripSection[] = [
    "overview",
    "itinerary",
    "accommodations",
    "expenses",
    "transport",
    "packing",
    "polls",
    "stages",
  ];

  const items: SidebarItem[] = sections.map((key) => ({
    key,
    href: `/trips/${tripId}${SECTION_HREFS[key]}`,
    icon: SECTION_ICONS[key],
    label: t(key),
    badge: unseenSections?.has(key) && key !== currentSection,
  }));

  return (
    <Sidebar
      items={items}
      current={currentSection}
      ariaLabel="Trip navigation"
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/TripNav.tsx
git commit -m "feat: convert TripNav to use Sidebar"
```

---

### Task 6: Update the 3 AppNav pages

**Files:**
- Modify: `src/app/[locale]/trips/page.tsx`
- Modify: `src/app/[locale]/templates/page.tsx`
- Modify: `src/app/[locale]/bucketlist/page.tsx`

Apply this pattern to each file:

**1. Add import at top:**
```tsx
import { useSidebarState } from "@/hooks/useSidebarState";
```

**2. Add hook call inside the component (after existing useState calls):**
```tsx
const sidebar = useSidebarState();
```

**3. Update `<AppHeader />` to pass the toggle:**
```tsx
<AppHeader onMobileMenuToggle={sidebar.toggle} />
```

**4. Update `<AppNav />` to pass mobile state:**
```tsx
<AppNav current="trips" mobileOpen={sidebar.isOpen} onMobileClose={sidebar.close} />
// (use "templates" or "bucketlist" as appropriate for each page)
```

**5. Wrap post-nav content in a div with content offset:**

Find the `<div className="border-b border-white/10 px-4...` that comes immediately after `<AppNav>`. Wrap it and everything that follows (up to the closing root div) in:
```tsx
<div className="sm:pl-14">
  {/* existing content */}
</div>
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/app/[locale]/trips/page.tsx src/app/[locale]/templates/page.tsx src/app/[locale]/bucketlist/page.tsx
git commit -m "feat: wire sidebar state into AppNav pages"
```

---

### Task 7: Update the 8 TripNav pages

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/accommodations/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/expenses/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/transport/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/polls/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/stages/page.tsx`

Apply this pattern to each file:

**1. Add import:**
```tsx
import { useSidebarState } from "@/hooks/useSidebarState";
```

**2. Add hook call inside the component:**
```tsx
const sidebar = useSidebarState();
```

**3. Update `<AppHeader>` (already in backHref mode):**
```tsx
<AppHeader backHref="/trips" onMobileMenuToggle={sidebar.toggle} />
```

**4. Update `<TripNav>` to pass mobile state:**
```tsx
<TripNav
  tripId={tripId}
  currentSection="overview"   // (use the correct section for each page)
  unseenSections={unseenSections}
  mobileOpen={sidebar.isOpen}
  onMobileClose={sidebar.close}
/>
```

**5. For pages that use `<PageTransition>`, add `className="sm:pl-14"` to it:**
```tsx
<PageTransition section="itinerary" tripId={tripId} className="sm:pl-14">
```

**For the trip overview page (`trips/[tripId]/page.tsx`) which does NOT use `<PageTransition>`:**
Wrap the content that follows `<TripNav>` in:
```tsx
<div className="sm:pl-14">
  {/* existing content */}
</div>
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/app/[locale]/trips/
git commit -m "feat: wire sidebar state into TripNav pages"
```

---

### Task 8: Build check + manual verification

**Step 1: Run full build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without errors.

**Step 2: Start dev server and manually verify**

```bash
npm run dev
```

Check in browser (port 3000 or whatever `npm run dev` outputs):

- [ ] Desktop: icon strip visible on left for trips list page, template page, bucketlist page
- [ ] Desktop: clicking hamburger/chevron opens sidebar overlay with labels
- [ ] Desktop: clicking outside or pressing Escape closes it
- [ ] Desktop: active section has teal left border
- [ ] Desktop: unseen dot badge appears on TripNav icons when there's unseen activity
- [ ] Mobile (resize to <640px): icon strip hidden, hamburger appears in header
- [ ] Mobile: tapping hamburger opens full sidebar with icons + labels
- [ ] Mobile: tapping outside closes sidebar
- [ ] Content doesn't hide under the icon strip on desktop
- [ ] Header height appears consistent (no layout jump between pages)

**Step 3: Final commit (if any fixups)**

```bash
git add -A
git commit -m "fix: sidebar nav visual fixups"
```
