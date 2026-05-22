import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAppAppearance } from "@/lib/appAppearance";

if (typeof window !== "undefined") {
  initAppAppearance();
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:system-ui;padding:24px">Application failed to start: missing #root element.</p>';
} else {
  try {
    createRoot(rootEl).render(<App />);
  } catch (error) {
    console.error("[MSS] Fatal render error", error);
    const message = error instanceof Error ? error.message : String(error);
    rootEl.innerHTML = `<div style="font-family:system-ui;padding:24px;max-width:40rem"><h1 style="font-size:1.125rem;margin:0 0 8px">Application failed to start</h1><p style="margin:0 0 12px;color:#555">Try a hard refresh. If this persists, open Settings and reset demo data, or clear site data for this origin.</p><pre style="font-size:12px;overflow:auto;background:#f4f4f5;padding:12px;border-radius:8px">${message}</pre></div>`;
  }
}
