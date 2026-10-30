import { useEffect, useId, useRef } from "react";
import Button from "./Button.jsx";
import Icon from "./Icon.jsx";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Dialog({ title, text, confirmLabel = "Ya, hapus", icon = "trash", onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const cancelHandler = useRef(onCancel);
  cancelHandler.current = onCancel;
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const textId = `${baseId}-text`;

  useEffect(() => {
    const opener = document.activeElement;
    cancelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelHandler.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) || []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // Fokus tetap di dalam dialog walau pengguna mengklik di luarnya.
    // Dikembalikan setelah event selesai; focus() di dalam focusin diabaikan browser.
    let restore;
    function onFocusIn(event) {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        restore = setTimeout(() => cancelRef.current?.focus(), 0);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      clearTimeout(restore);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <div className="lc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel?.()}>
      <div className="lc-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} ref={dialogRef}>
        <span className="lc-dialog__icon">
          <Icon name={icon} />
        </span>
        <h2 className="lc-dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="lc-dialog__text" id={textId}>
          {text}
        </p>
        <div className="lc-dialog__actions">
          <Button variant="secondary" onClick={onCancel} ref={cancelRef}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
