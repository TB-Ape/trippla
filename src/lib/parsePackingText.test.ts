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
