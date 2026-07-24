"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-[#141414] border border-[#222] rounded-xl shadow-2xl",
            "w-full max-w-lg max-h-[90vh] overflow-y-auto",
            "data-[state=open]:animate-fade-in",
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-6 border-b border-[#222]">
              <div>
                {title && <Dialog.Title className="font-display text-xl font-semibold text-[#F5F0EB]">{title}</Dialog.Title>}
                {description && <Dialog.Description className="text-sm text-[#9A8F84] mt-1">{description}</Dialog.Description>}
              </div>
              <Dialog.Close asChild>
                <button onClick={onClose} className="text-[#5A5249] hover:text-[#F5F0EB] transition-colors p-1">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
          )}
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
