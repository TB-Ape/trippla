import { useState } from "react";

export function useSidebarState() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    toggle: () => setIsOpen((v) => !v),
    close: () => setIsOpen(false),
  };
}
