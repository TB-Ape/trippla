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
