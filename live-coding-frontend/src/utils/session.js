export function getSessionIdFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);

  if (parts[0] === "session" && parts[1]) {
    return parts[1];
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("session") || "demo-session";
}
