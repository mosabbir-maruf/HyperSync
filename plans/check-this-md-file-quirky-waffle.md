# LocalShare — Production Frontend Build Plan

## Context

`src/imports/pasted_text/project-vision.md` specifies **LocalShare**: a browser-first,
privacy-first, peer-to-peer file transfer app. File bytes must never touch a server —
they flow Browser → WebRTC DataChannel → Browser. A backend (Cloudflare Worker +
Durable Objects) exists only to relay signaling (SDP offer/answer + ICE), and is built
separately by the user.

This Figma Make environment runs the **frontend only**; no Worker can run here. Per the
user's direction we build the complete production frontend with a real WebRTC + transfer
architecture, and a **clean `SignalingClient` interface**. For local dev we ship an
**in-memory signaling adapter** (module-singleton hub, routing messages between peers in
the same JS runtime — *not* BroadcastChannel, *not* production). The Cloudflare WebSocket
adapter is also implemented against the same interface so it's a config-only swap later.
No signaling implementation is referenced inside React components or the transfer engine.

Current state: fresh scaffold — `src/App.tsx` is a placeholder dot-grid; `src/index.css`
only imports Tailwind v4. Everything below is net-new.

## Architecture (strict layering — UI depends on interfaces only)

```
src/
  lib/
    capabilities.ts            # feature/platform detection (WebRTC, FS Access, iOS/Android)
    utils.ts                   # cn(), formatBytes, formatDuration, crypto id/code helpers
    signaling/
      types.ts                 # SignalingMessage union, Role, SessionInfo, ConnectionState
      SignalingClient.ts       # interface + tiny typed EventEmitter base
      InMemorySignalingClient.ts   # DEV-ONLY adapter (uses signalingHub)
      signalingHub.ts          # module-singleton in-memory session broker
      CloudflareSignalingClient.ts # WebSocket adapter (same interface; needs URL)
      index.ts                 # createSignalingClient() factory (env-switched)
    webrtc/
      iceConfig.ts             # public STUN list; TURN slot documented/empty
      PeerConnection.ts        # wraps RTCPeerConnection, negotiates via SignalingClient
    transfer/
      protocol.ts              # framing: JSON control msgs + binary chunk headers
      chunking.ts              # slice File → fixed chunks; constants (16 KiB)
      TransferSender.ts        # read+send loop, backpressure, pause/resume/cancel
      TransferReceiver.ts      # reassemble → FS Access WritableStream or Blob fallback
      TransferManager.ts       # orchestrates transfers over a datachannel; event emitter
      types.ts                 # FileMeta, TransferItem, TransferStatus, progress events
  state/
    ThemeProvider.tsx          # theme (light/dark/system) + localStorage
    SettingsProvider.tsx       # settings; language-ready (i18n scaffold, en only)
    HistoryStore.ts + useHistory.ts  # localStorage, METADATA ONLY (never bytes)
    useSession.ts              # binds SignalingClient + PeerConnection to render state
    useTransfers.ts            # subscribes to TransferManager events → progress state
  components/
    layout/ (AppShell, SideNav, MobileTabBar, ThemeToggle, ConnectionStatus)
    ui/ (Button, Card, Progress, IconButton, Sheet/Modal, CodeInput, icons.tsx)
    session/ (QRDisplay, SessionCode, PeerCard, DropZone, TransferRow, TransferList)
  routes/ (Home, CreateSession, JoinSession, SessionRoom, History, Settings)
  App.tsx                      # Providers + Router
  main.tsx                     # unchanged entry
  index.css                    # @import fonts, Tailwind, @theme tokens + .dark
```

### Key contracts

**`SignalingClient` (interface):** `connect()`, `createSession(): Promise<SessionInfo>`,
`joinSession(code): Promise<SessionInfo>`, `send(msg: SignalingMessage)`,
`on(type, handler): Unsubscribe`, `close()`, `state`. Messages carry only session control
+ SDP/ICE — never file data. `PeerConnection` and `TransferManager` accept a
`SignalingClient` by interface; they never import a concrete adapter.

**Factory (`signaling/index.ts`):** returns `CloudflareSignalingClient` when
`import.meta.env.VITE_SIGNALING_URL` is set, else `InMemorySignalingClient`. This is the
single swap point; UI/transfer code untouched when the Worker lands.

**Transfer engine isolation:** all binary logic lives in `lib/transfer/*`. React reads
only numbers/metadata via `useTransfers` (bytesSent, %, status, speed). ArrayBuffers never
enter React state; no per-chunk re-render (throttled progress emits ~10–20/s).

**Backpressure:** `dataChannel.bufferedAmountLowThreshold` + `onbufferedamountlow`; sender
pauses reads when `bufferedAmount` exceeds a high-watermark. Chunk size 16 KiB.

**Receiver output:** stream to disk via `showSaveFilePicker`/`WritableStream` when
available (avoids full in-memory load); fall back to accumulating chunks → `Blob` +
download link where unsupported (iOS Safari), with an honest size caveat in the UI.

**Security/privacy (from vision):** ids/codes via `crypto.randomUUID` / `crypto.getRandomValues` only (no `Math.random`); validate + reject malformed signaling messages; escape/sanitize filenames on display; never `innerHTML`; UI copy states "files are not uploaded to LocalShare servers; backend only coordinates the connection" — no "LAN guaranteed" claims.

## Routing (react-router-dom)

`/` Home (Create / Join choice) · `/create` (QR + code, waiting-for-peer) ·
`/join` (code entry + QR-scan affordance) · `/session/:id` (active room: peers, dropzone,
transfer list) · `/history` · `/settings`. Follow the `make:react-router` skill for wiring.

## Design / aesthetic

Brief specifies the stance explicitly — **premium desktop utility (Linear/Apple/GitHub
polish)**: minimal, hairline borders, generous Apple-like spacing, restrained accent,
full light + dark mode. No glassmorphism/heavy gradients/pink/purple/neon/huge shadows.
- Fonts (Google, via `@import` at top of `index.css`): **Inter** (UI/body), **JetBrains
  Mono** (session codes, byte counts, status labels).
- Tokens in `index.css` via Tailwind v4 `@theme` + `.dark` block: neutral ground, single
  cool accent for interactive emphasis; map to `bg-background`, `text-foreground`,
  `bg-card`, `border-border`, etc.
- Desktop: sidebar shell. Mobile (<1000px): bottom tab bar, touch-sized targets; handle
  iOS Safari quirks (100dvh, save-picker fallback). Custom inline SVG icon set.
- Will call `create_make_theme` once at implementation start to seed `guidelines`/token
  choices, then commit.

## Dependencies to add

`react-router-dom` (routing), `qrcode.react` (QR rendering — not a signaling service).
No PeerJS/Firebase/Supabase/Pusher/Ably/Socket.io. A small `cn` util instead of clsx.

## Implementation order

1. Tokens + fonts in `index.css`; `lib/utils.ts`, `lib/capabilities.ts`; `create_make_theme`.
2. Signaling: `types` → `SignalingClient` → `signalingHub` → `InMemory` + `Cloudflare` → factory.
3. WebRTC: `iceConfig`, `PeerConnection` (negotiation over SignalingClient).
4. Transfer engine: `protocol`, `chunking`, `Sender`, `Receiver`, `TransferManager`.
5. State: Theme/Settings providers, HistoryStore, `useSession`, `useTransfers`.
6. UI primitives + layout shell + icons.
7. Routes/flows: Home → Create/Join → SessionRoom (dropzone, progress, pause/resume/cancel/retry) → History → Settings.
8. Responsive pass + iOS/Android handling; wire `App.tsx` (providers + router).

## Verification

- Dev server is already running; confirm the app compiles (Vite HMR / `figma logs` only if a failure shows).
- In-memory demo: with no `VITE_SIGNALING_URL`, the SessionRoom offers a "simulate peer"
  path so a real loopback `RTCPeerConnection`↔`RTCPeerConnection` transfer runs end-to-end
  in one runtime — pick a file, watch chunked progress, backpressure, pause/resume/cancel,
  and a received download. This exercises the real WebRTC + transfer stack (only the
  signaling transport is the dev adapter).
- Verify History records metadata only (no bytes) and persists across reload; theme toggle
  persists; layout holds at mobile breakpoint.
- Confirm no concrete signaling adapter is imported anywhere under `components/`, `routes/`,
  or `lib/transfer/` (interface + factory only) — proving the 1:1 Cloudflare swap.
```
