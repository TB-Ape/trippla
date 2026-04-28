import {
  Camera, Utensils, Music, Pill, Dumbbell, Bike, Glasses, Coffee,
  Globe, Book, PawPrint, Gamepad2, Sun, Baby, Heart, Star,
  Shirt, Backpack, Scissors, Phone, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PACKING_ICON_MAP: Record<string, LucideIcon> = {
  Camera, Utensils, Music, Pill, Dumbbell, Bike, Glasses, Coffee,
  Globe, Book, PawPrint, Gamepad2, Sun, Baby, Heart, Star,
  Shirt, Backpack, Scissors, Phone,
};

export function getPackingIcon(name: string | null | undefined): LucideIcon {
  if (name && name in PACKING_ICON_MAP) return PACKING_ICON_MAP[name];
  return Package;
}
