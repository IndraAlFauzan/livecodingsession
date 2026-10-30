import { useEffect, useState } from "react";
import ScreenshotShield from "./session/ScreenshotShield.jsx";

const BLOCKED_SHORTCUTS = new Set(["c", "x", "a", "s", "p", "u"]);

// Browser tidak bisa memblokir screenshot dari OS atau kamera; ini hanya mempersulit penyalinan.
export default function ProtectedArea({ children }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      // macOS Cmd+Shift+3/4/5 dan Windows Win+Shift+S: sembunyikan begitu kombinasi modifier ditekan.
      if (event.key === "PrintScreen" || (event.metaKey && event.shiftKey)) setHidden(true);

      if ((event.metaKey || event.ctrlKey) && BLOCKED_SHORTCUTS.has(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function onKeyUp(event) {
      if (event.key !== "PrintScreen") return;
      setHidden(true);
      navigator.clipboard?.writeText("").catch(() => {});
    }

    function blockClipboard(event) {
      event.preventDefault();
      event.clipboardData?.setData("text/plain", "");
    }

    function block(event) {
      event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("contextmenu", block, true);
    document.addEventListener("dragstart", block, true);
    document.body.classList.add("no-print");

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("contextmenu", block, true);
      document.removeEventListener("dragstart", block, true);
      document.body.classList.remove("no-print");
    };
  }, []);

  return (
    <div className="lc-protected">
      <div className={hidden ? "lc-protected__content is-hidden" : "lc-protected__content"}>{children}</div>
      {hidden && (
        <div className="lc-protected__shield">
          <ScreenshotShield onReveal={() => setHidden(false)} />
        </div>
      )}
    </div>
  );
}
