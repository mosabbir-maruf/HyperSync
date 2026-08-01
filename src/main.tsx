import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { OpfsDownloadProvider } from "./lib/transfer/OpfsDownloadProvider"

// Run cleanup of any leftover temp files from previous aborted transfers
OpfsDownloadProvider.cleanupStaleFiles()

// Prevent the browser from opening dropped files if they miss the drop zone
window.addEventListener("dragover", (e) => e.preventDefault())
window.addEventListener("drop", (e) => e.preventDefault())

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
