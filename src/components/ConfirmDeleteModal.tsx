"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ title, message, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const t = useTranslations("common");

  return (
    <Modal open onClose={onCancel}>
      <Modal.Header>
        <h2 className="text-2xl font-black mb-4 tracking-tight text-red-400">{title}</h2>
        <p className="text-gray-400">{message}</p>
      </Modal.Header>
      <Modal.Footer>
        <Button
          onClick={onConfirm}
          variant="outline"
          className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
        >
          {t("delete")}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t("cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
