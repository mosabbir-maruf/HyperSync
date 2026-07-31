import { lazy, Suspense, useEffect } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { ThemeProvider } from "./state/ThemeProvider"
import { SettingsProvider } from "./state/SettingsProvider"
import { SessionProvider } from "./state/SessionProvider"
import { LobbyProvider } from "./state/LobbyProvider"
import { DialogProvider } from "./state/DialogProvider"
import { AppShell } from "./components/layout/AppShell"
import { ToastViewport } from "./components/ui/ToastViewport"

const Landing = lazy(() =>
  import("./routes/Landing").then((module) => ({ default: module.Landing })),
)
const Home = lazy(() =>
  import("./routes/Home").then((module) => ({ default: module.Home })),
)
const CreateSession = lazy(() =>
  import("./routes/CreateSession").then((module) => ({
    default: module.CreateSession,
  })),
)
const JoinSession = lazy(() =>
  import("./routes/JoinSession").then((module) => ({
    default: module.JoinSession,
  })),
)
const History = lazy(() =>
  import("./routes/History").then((module) => ({ default: module.History })),
)
const Settings = lazy(() =>
  import("./routes/Settings").then((module) => ({ default: module.Settings })),
)
const About = lazy(() =>
  import("./routes/About").then((module) => ({ default: module.About })),
)

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = hash.slice(1)
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (!el) return false
      el.scrollIntoView({ behavior: "auto", block: "start" })
      return true
    }
    if (tryScroll()) return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      if (tryScroll() || attempts >= 20) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <SessionProvider>
          <BrowserRouter>
            <ScrollToTop />
            <DialogProvider>
              <LobbyProvider>
                <AppShell>
                  <Suspense fallback={null}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/app" element={<Home />} />
                      <Route path="/send" element={<CreateSession />} />
                      <Route
                        path="/create"
                        element={<Navigate to="/send" replace />}
                      />
                      <Route path="/join" element={<JoinSession />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/about" element={<About />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </AppShell>
                <ToastViewport />
              </LobbyProvider>
            </DialogProvider>
          </BrowserRouter>
        </SessionProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
