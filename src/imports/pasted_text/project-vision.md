You are Claude Opus acting as a Principal Software Architect, Principal Frontend Engineer, Principal Backend Engineer, Security Engineer, Performance Engineer, QA Lead and Product Designer.

You are NOT simply generating code.

You are responsible for designing and implementing a complete production-ready software product from scratch.

===========================================================
PROJECT NAME
===========================================================

LocalShare

===========================================================
PROJECT VISION
===========================================================

LocalShare is a browser-first, privacy-first, peer-to-peer file sharing platform.

The primary goal is extremely simple:

Users should be able to open the website from any modern device on the same local network and transfer files directly between devices without uploading files to any server.

Supported devices include:

- macOS
- Windows
- Linux
- iPhone
- iPad
- Android
- ChromeOS

No desktop application should be required.

No installation should be required.

No account should be required.

No login should be required.

No registration should be required.

No cloud storage should ever exist.

===========================================================
PRIMARY PRODUCT GOALS
===========================================================

The highest priorities are:

1.
Privacy.

File contents must never pass through our backend.

2.

Direct peer-to-peer transfer.

3.

Modern beautiful interface.

4.

Simple pairing.

5.

Cross-platform browser compatibility.

6.

Excellent mobile experience.

7.

Excellent desktop experience.

8.

Large file support within browser limitations.

9.

Production quality architecture.

10.

Long-term maintainability.

===========================================================
ABSOLUTE REQUIREMENTS
===========================================================

Files must NEVER be uploaded to:

Cloudflare

Worker

Durable Objects

Any server

Any object storage

Any database

Any analytics provider

Any CDN endpoint

Actual bytes must always flow:

Browser

↓

WebRTC DataChannel

↓

Browser

The backend may only transport signaling messages.

===========================================================
HOSTING
===========================================================

Frontend:

Cloudflare Pages

Backend:

Cloudflare Worker

Cloudflare Durable Objects

Worker responsibilities:

Session creation

Pairing

Offer exchange

Answer exchange

ICE candidate exchange

Peer lifecycle

Session expiration

Nothing else.

===========================================================
DO NOT BUILD
===========================================================

Do not build:

authentication

accounts

login

user profiles

database

analytics

telemetry

notifications

email

cloud storage

file history synced online

background upload service

upload queue

server-side file cache

thumbnail generation

virus scanning

image processing

video processing

preview generation

Nothing server-side should inspect file contents.

===========================================================
TECH STACK
===========================================================

Frontend

React

TypeScript

Vite

TailwindCSS

Backend

Cloudflare Workers

Durable Objects

Native Browser APIs

WebRTC

RTCDataChannel

Web Crypto API

No Node backend.

No Express.

No Fastify.

No NestJS.

===========================================================
DESIGN PHILOSOPHY
===========================================================

The visual design is inspired by premium desktop utilities.

Avoid:

Glassmorphism

Heavy gradients

Pink

Purple

Neon

Huge shadows

Cartoon UI

Prefer:

Minimal

Elegant

Fast

Professional

Apple-like spacing

GitHub-quality typography

Linear-like polish

Native-feeling interactions

Dark mode

Light mode

The application should feel like a desktop application running inside the browser.

===========================================================
CORE FEATURES
===========================================================

Create Share Session

Join Session

QR pairing

Short code pairing

Peer verification

Direct transfer

Progress

Pause

Resume (within browser capabilities)

Cancel

Retry

Connection status

Transfer history (local browser only)

Settings

Theme

Language-ready architecture

===========================================================
SESSION FLOW
===========================================================

Sender

↓

Create Session

↓

Receive QR + Session Code

↓

Receiver opens website

↓

Scan QR OR Enter Code

↓

Worker connects signaling

↓

WebRTC negotiation

↓

Direct connection established

↓

Receiver accepts transfer

↓

Transfer begins

===========================================================
SECURITY
===========================================================

Every session ID must be generated using crypto.randomUUID() or secure browser crypto APIs.

Never use Math.random().

Validate every signaling message.

Reject malformed messages.

Never trust peer input.

Escape filenames.

Do not trust MIME types.

Never use innerHTML.

===========================================================
PRIVACY
===========================================================

Never claim:

LAN guaranteed

Internet never touched

Instead accurately communicate:

Files are transferred directly between connected devices.

Files are not uploaded to LocalShare servers.

Our backend only coordinates peer connection establishment.

===========================================================
ENGINEERING PHILOSOPHY
===========================================================

Every module must have a single responsibility.

Avoid God classes.

Avoid giant React components.

Prefer composition.

Prefer interfaces.

Prefer dependency inversion.

Avoid duplicated logic.

Avoid hidden global state.

Binary transfer logic must never live inside React components.

UI components should only render state.

===========================================================
PERFORMANCE PRINCIPLES
===========================================================

Never load an entire file into memory.

Never base64 encode large files.

Never store ArrayBuffers inside React state.

Never rerender the application every transfer chunk.

Never create unnecessary object allocations inside hot paths.

Transfer engine and UI must be isolated.

===========================================================
QUALITY TARGET
===========================================================

The final application should feel comparable in polish to:

AirDrop

LocalSend

PairDrop

Snapdrop

while maintaining our own original architecture and implementation.