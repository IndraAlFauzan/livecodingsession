import { useEffect, useRef } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Kerangka semua jendela modal: latar, jebakan fokus, Esc, dan fokus kembali ke
// pemicu. Isinya ditentukan pemakai -- Dialog dan MeetingDetail berbeda bentuk.
export default function Modal({ role = "dialog", labelledBy, describedBy, onClose, className, initialFocus, children }) {
  const panelRef = useRef(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const focusFirst = () =>
      (initialFocus?.current || panelRef.current?.querySelector(FOCUSABLE))?.focus();
    focusFirst();

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
        restore = setTimeout(focusFirst, 0);
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
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}>
        {children}
      </div>
    </div>
  );
}
