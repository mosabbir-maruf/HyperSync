import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { ThemeProvider } from "./state/ThemeProvider"
import { SettingsProvider } from "./state/SettingsProvider"
import { SessionProvider } from "./state/SessionProvider"
import { LobbyProvider } from "./state/LobbyProvider"
import { DialogProvider } from "./state/DialogProvider"
import { AppShell } from "./components/layout/AppShell"
import { ToastViewport } from "./components/ui/ToastViewport"

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

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <SessionProvider>
          <BrowserRouter>
            <DialogProvider>
              <LobbyProvider>
                <AppShell>
                  <Suspense fallback={null}>
                    <Routes>
                      <Route path="/" element={<Home />} />
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
