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
