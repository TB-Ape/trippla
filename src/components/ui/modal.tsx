"use client";

import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 px-8 pt-8 pb-4">
      {children}
    </div>
  );
}

function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-y-auto flex-1 px-8 pb-4">{children}</div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 px-8 pb-8 pt-2">
      {children}
    </div>
  );
}

export function Modal({ open, onClose, maxWidth = "max-w-md", children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-[#1a1a1a] border border-white/20 ${maxWidth} w-full flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
