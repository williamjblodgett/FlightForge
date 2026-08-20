"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, busy = false, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }} onClose={() => { if (open && !busy) onCancel(); }}>
    <form method="dialog" onSubmit={(event) => event.preventDefault()}>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{description}</p>
      <div className="confirm-dialog-actions">
        <button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
        <button className={`button ${destructive ? "button-danger" : "button-primary"}`} type="button" disabled={busy} onClick={() => void onConfirm()}>{busy ? "Working…" : confirmLabel}</button>
      </div>
    </form>
  </dialog>;
}
