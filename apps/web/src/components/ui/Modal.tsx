import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="ui-modal"
      aria-labelledby="ui-modal-title"
      aria-describedby={description ? "ui-modal-description" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ui-modal-panel">
        <div className="ui-modal-heading">
          <h2 id="ui-modal-title">{title}</h2>
          <Button variant="text" aria-label="Close dialog" onClick={onClose}>Close</Button>
        </div>
        {description && <p id="ui-modal-description" className="ui-modal-description">{description}</p>}
        <div className="ui-modal-content">{children}</div>
        {(onConfirm || confirmLabel) && (
          <div className="ui-modal-actions">
            <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
            {onConfirm && (
              <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel ?? "Confirm"}
              </Button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
