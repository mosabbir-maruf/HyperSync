You are a senior software architect and principal frontend engineer.

You are working on my existing LocalShare repository.

IMPORTANT:

This is NOT a new project.

Do NOT rebuild from scratch.

Do NOT redesign the UI.

The application already has an excellent visual design.

Your job is to completely refactor the FRONTEND architecture into a production-grade browser-first peer-to-peer application while preserving the existing visual experience.

==================================================
PRIMARY OBJECTIVE
==================================================

Transform the current frontend into a production-quality browser-first application.

Keep:

• UI
• UX
• visual hierarchy
• typography
• spacing
• colors
• layout
• responsive design
• animations
• component appearance

DO NOT redesign.

Instead, redesign the INTERNAL architecture.

==================================================
NEW PRODUCT
==================================================

LocalShare is now:

A browser-based peer-to-peer file sharing application.

Users open the hosted website.

No desktop agent.

No localhost server.

No Go backend.

No native daemon.

No installation required.

Users should be able to use:

• macOS
• Windows
• Linux
• Android
• iPhone
• iPad

through modern browsers.

==================================================
FINAL ARCHITECTURE
==================================================

Cloudflare Pages
        │
        ▼
React Application
        │
        ▼
Signaling Client (future Worker)
        │
        ▼
WebRTC
        │
        ▼
Browser ⇄ Browser

Actual file bytes NEVER pass through Cloudflare.

==================================================
IMPORTANT
==================================================

DO NOT implement the signaling backend.

Only prepare the frontend architecture.

==================================================
FIRST TASK
==================================================

Inspect the ENTIRE repository before changing anything.

Understand:

• folder structure
• routing
• hooks
• components
• services
• stores
• utilities
• dependencies
• build system

Create a complete understanding first.

Do not immediately begin coding.

==================================================
CODE AUDIT
==================================================

Search for:

• duplicate components
• duplicate hooks
• duplicate utilities
• dead code
• unused components
• unused services
• unused packages
• duplicated business logic
• duplicated types
• unnecessary abstractions
• localhost assumptions
• Go-agent assumptions
• fake production behavior

Remove everything unnecessary.

Never break the UI.

==================================================
OLD ARCHITECTURE
==================================================

Find everything related to:

Go backend

Agent

localhost

TCP backend

mDNS

native daemon

backend polling

backend websocket

agent discovery

agent configuration

Remove frontend coupling to those systems.

Do not delete backend source.

Only isolate/remove frontend dependencies.

==================================================
NEW FRONTEND LAYERS
==================================================

Refactor into clean layers.

Presentation

↓

Application State

↓

Domain Services

↓

Transport

↓

Browser APIs

React components must NEVER contain protocol logic.

==================================================
MODULE STRUCTURE
==================================================

Refactor into something similar to:

src/

components/

features/

pairing/

nearby/

transfer/

history/

settings/

hooks/

lib/

browser/

crypto/

peer/

signaling/

transfer/

webrtc/

types/

utils/

Keep the repository clean.

==================================================
COMPONENT RULES
==================================================

Components should only:

Render UI

Receive props

Dispatch actions

Never:

Read WebRTC directly

Read RTCDataChannel directly

Contain protocol logic

Contain networking

Contain transfer engine

==================================================
STATE MANAGEMENT
==================================================

Audit current state management.

Keep only lightweight UI state.

Never store:

ArrayBuffers

Chunks

Binary data

Entire files

Inside React state.

==================================================
TRANSFER ENGINE
==================================================

Create abstractions only.

Do NOT fully implement.

Prepare interfaces for:

TransferEngine

PeerConnectionManager

SessionManager

BrowserCapabilities

TransferProtocol

IntegrityService

These should all be dependency-injected.

==================================================
SIGNALING
==================================================

Create a SignalingClient interface.

No implementation.

Methods should cover:

connect()

disconnect()

createSession()

joinSession()

leaveSession()

sendOffer()

sendAnswer()

sendCandidate()

sendTransferRequest()

sendAccept()

sendReject()

sendCancel()

onMessage()

Do not hardcode Cloudflare.

==================================================
WEBRTC
==================================================

Create a WebRtcTransport abstraction.

No UI component should directly create:

RTCPeerConnection

RTCDataChannel

Those belong inside transport.

==================================================
TRANSFER PROTOCOL
==================================================

Prepare types only.

Transfer metadata

Chunk metadata

Control messages

Transfer IDs

Session IDs

Progress

Errors

Capabilities

Version

Message types

Keep protocol versioned.

==================================================
BROWSER CAPABILITIES
==================================================

Create a capability detection layer.

Detect support for:

WebRTC

File System Access API

Directory Picker

File Picker

Writable Streams

Clipboard

QR scanning

Camera

Share API

Do not use user-agent detection unless unavoidable.

==================================================
MOBILE SUPPORT
==================================================

Treat:

Safari

Chrome Android

Samsung Internet

Firefox

as first-class.

Do not assume Chromium APIs.

==================================================
FEATURE FLAGS
==================================================

Introduce capability flags.

Example:

supportsWebRTC

supportsDirectoryPicker

supportsWritableFiles

supportsShareAPI

supportsQRScanner

The UI should react to capabilities.

==================================================
RESPONSIVE AUDIT
==================================================

Review every page.

Fix:

overflow

small touch targets

modal sizing

safe area

keyboard overlap

landscape layouts

without changing visual identity.

==================================================
ACCESSIBILITY
==================================================

Improve:

focus states

ARIA

keyboard navigation

dialog semantics

progress semantics

labels

==================================================
DEPENDENCIES
==================================================

Audit package.json.

Remove:

unused libraries

old networking libraries

old Go integration packages

unused icons

unused utilities

Do NOT add unnecessary packages.

==================================================
PERFORMANCE
==================================================

Review:

rerenders

memoization

expensive calculations

large contexts

prop drilling

lazy loading

route splitting

bundle size

Remove unnecessary work.

==================================================
DESIGN SYSTEM
==================================================

Preserve every visual aspect.

No redesign.

No color changes.

No spacing changes.

No typography changes.

==================================================
ERROR HANDLING
==================================================

Introduce centralized frontend error handling.

Never:

console.error everywhere.

Create proper typed errors.

==================================================
LOGGING
==================================================

Create centralized logger.

Development logging only.

Production should remain clean.

==================================================
TESTING
==================================================

Run:

npm install

npm run typecheck

npm run lint

npm run build

Run tests if configured.

Fix all issues.

==================================================
FINAL CLEANUP
==================================================

Search again for:

dead code

duplicate logic

unused imports

unused exports

unused dependencies

obsolete architecture

Fix everything.

==================================================
OUTPUT
==================================================

Do not stop after planning.

Actually perform the refactor.

Then provide a detailed report including:

1. Architecture changes

2. Folder changes

3. Components removed

4. Components added

5. Services created

6. Types created

7. Interfaces created

8. Performance improvements

9. Dependency changes

10. Build status

11. Remaining work for Phase 2

Do NOT begin implementing the backend.

Do NOT implement signaling.

Do NOT implement WebRTC transfer logic yet.

Only build a production-grade frontend architecture ready for those systems.