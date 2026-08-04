import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { OpfsDownloadProvider } from "./lib/transfer/OpfsDownloadProvider"
import { registerSW } from "virtual:pwa-register"

registerSW({ immediate: true })

// Run cleanup of any leftover temp files from previous aborted transfers
OpfsDownloadProvider.cleanupStaleFiles()

// Prevent the browser from opening dropped files if they miss the drop zone
window.addEventListener("dragover", (e) => e.preventDefault())
window.addEventListener("drop", (e) => e.preventDefault())

// Auto-reload on chunk load errors (happens when the app is updated while a tab is open)
window.addEventListener("vite:preloadError", () => {
  window.location.reload()
})
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes("Failed to fetch dynamically imported module")) {
    event.preventDefault()
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
