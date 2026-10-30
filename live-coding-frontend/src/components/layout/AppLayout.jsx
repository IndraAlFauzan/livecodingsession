import { createContext, useContext, useEffect, useState } from "react";

const DrawerContext = createContext(null);

export function useDrawer() {
  return useContext(DrawerContext);
}

// Sidebar jadi drawer di bawah 1024px; di atas itu drawer tidak pernah aktif.
export default function AppLayout({ sidebar, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open: () => setOpen(true) }}>
      <div className={["lc-app", open && "is-drawer-open"].filter(Boolean).join(" ")}>
        <div className="lc-app__scrim" onClick={() => setOpen(false)} aria-hidden="true" />
        <div className="lc-app__aside">{sidebar}</div>
        <div className="lc-main">{children}</div>
      </div>
    </DrawerContext.Provider>
  );
}
