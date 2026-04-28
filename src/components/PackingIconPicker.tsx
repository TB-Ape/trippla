"use client";

import { PACKING_ICON_MAP } from "@/lib/packingIcons";

interface PackingIconPickerProps {
  selected: string;
  onChange: (iconName: string) => void;
}

export function PackingIconPicker({ selected, onChange }: PackingIconPickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
      {Object.entries(PACKING_ICON_MAP).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          title={name}
          onClick={() => onChange(name)}
          className={`w-9 h-9 flex items-center justify-center rounded border-2 transition-colors ${
            selected === name
              ? "border-indigo-500/70 bg-indigo-500/25"
              : "border-transparent bg-white/5 hover:bg-white/10"
          }`}
        >
          <Icon
            className={`w-[18px] h-[18px] ${
              selected === name ? "text-indigo-300" : "text-slate-400"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
