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
import { GroupSessionProvider } from "./state/GroupSessionProvider"
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
const Changelog = lazy(() =>
  import("./routes/Changelog").then((module) => ({
    default: module.Changelog,
  })),
)
const GroupLanding = lazy(() =>
  import("./routes/GroupLanding").then((module) => ({
    default: module.GroupLanding,
  })),
)
const GroupRoom = lazy(() =>
  import("./routes/GroupRoom").then((module) => ({
    default: module.GroupRoom,
  })),
)
const NotFound = lazy(() =>
  import("./routes/NotFound").then((module) => ({
    default: module.NotFound,
  })),
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

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const base = "HyperSync"
    switch (pathname) {
      case "/":
        document.title = `${base} — Secure Peer-to-Peer Local File Transfer`
        break
      case "/app":
        document.title = `Devices | ${base}`
        break
      case "/send":
      case "/create":
        document.title = `Send Files | ${base}`
        break
      case "/join":
        document.title = `Join Session | ${base}`
        break
      case "/history":
        document.title = `History | ${base}`
        break
      case "/settings":
        document.title = `Settings | ${base}`
        break
      case "/about":
        document.title = `About Us | ${base}`
        break
      case "/changelog":
        document.title = `Changelog | ${base}`
        break
      default:
        document.title = `404 Signal Lost | ${base}`
    }
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <SessionProvider>
          <GroupSessionProvider>
            <BrowserRouter>
              <ScrollToTop />
              <RouteTitle />
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
                        <Route path="/changelog" element={<Changelog />} />
                        <Route path="/group" element={<GroupLanding />} />
                        <Route path="/group/:code" element={<GroupRoom />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AppShell>
                  <ToastViewport />
                </LobbyProvider>
              </DialogProvider>
            </BrowserRouter>
          </GroupSessionProvider>
        </SessionProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
