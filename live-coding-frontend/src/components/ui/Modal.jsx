import { useEffect, useId, useRef } from "react";
import IconButton from "./IconButton.jsx";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Dasar semua jendela modal: Esc menutup, fokus terkunci, fokus kembali ke pemicu.
export default function Modal({ role = "dialog", title, head, onClose, className, initialFocus, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  const titleId = `${useId()}-title`;

  useEffect(() => {
    const opener = document.activeElement;
    (initialFocus?.current || closeRef.current)?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHandler.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || []);
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

    // Dikembalikan setelah event selesai; focus() di dalam focusin diabaikan browser.
    let restore;
    function onFocusIn(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        restore = setTimeout(() => (initialFocus?.current || closeRef.current)?.focus(), 0);
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
  }, [initialFocus]);

  return (
    <div className="lc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        className={["lc-dialog", className].filter(Boolean).join(" ")}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}>
        <div className="lc-modal__head">
          <h2 className="lc-dialog__title" id={titleId}>
            {title}
          </h2>
          {head}
          <IconButton ref={closeRef} icon="x" label="Tutup" variant="plain" size="sm" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
