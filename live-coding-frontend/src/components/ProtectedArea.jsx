import { useEffect, useMemo, useState } from "react";

const BLOCKED_SHORTCUTS = new Set(["c", "x", "a", "s", "p", "u"]);

function escapeXml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function watermarkImage(text) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220">` +
    `<text x="180" y="110" text-anchor="middle" transform="rotate(-24 180 110)" ` +
    `fill="#ffffff" fill-opacity="0.09" font-family="sans-serif" font-size="15">${escapeXml(text)}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

// Browser tidak bisa memblokir screenshot dari OS atau kamera; ini hanya mempersulit dan membuat bocoran bisa dilacak.
export default function ProtectedArea({ watermark, children }) {
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

  const backgroundImage = useMemo(() => watermarkImage(watermark), [watermark]);

  return (
    <div className="protected-area">
      <div className={hidden ? "protected-content is-hidden" : "protected-content"}>{children}</div>
      <div className="watermark" style={{ backgroundImage }} aria-hidden="true" />
      {hidden && (
        <div className="screenshot-shield" role="alert">
          <p>Kode disembunyikan karena terdeteksi shortcut screenshot.</p>
          <button className="btn btn-primary" onClick={() => setHidden(false)}>
            Tampilkan lagi
          </button>
        </div>
      )}
    </div>
  );
}
