# LocalShare Frontend Master Implementation
## Prompt 2 — Frontend Engineering Specification (Part 2)

Continue implementing the frontend.

Do not redesign anything from Prompt 1.

Do not replace technologies.

Everything below is mandatory.

---

# BROWSER CAPABILITY DETECTION

Before allowing transfers, automatically detect browser capabilities.

Create a CapabilityService.

It should detect:

- WebRTC support
- RTCDataChannel support
- File API
- Blob API
- Streams API
- IndexedDB
- Clipboard API
- QR camera availability
- Camera permission
- File System Access API
- Touch device
- Mobile browser
- Desktop browser
- Safari
- Chrome
- Firefox
- Edge

Never scatter feature detection throughout components.

Everything must come from CapabilityService.

---

# BROWSER COMPATIBILITY

Support:

Chrome

Edge

Firefox

Safari

Brave

Arc

Samsung Internet

Chrome Android

Safari iOS

Do not implement browser-specific hacks inside components.

Instead:

BrowserAdapter

↓

Capability Layer

↓

UI

---

# FILE SYSTEM ACCESS

Create an abstraction.

StorageProvider

↓

FileSystemAccessProvider

↓

InputFileProvider

↓

DragDropProvider

↓

MobilePickerProvider

The UI must never know where files came from.

---

# FILE PICKER

Support:

Click

Drag & Drop

Paste

Mobile picker

Folder picker (future-ready)

Multiple files

Huge files

Directory support interface should already exist even if disabled.

---

# DRAG & DROP

Desktop should support:

Drag files

Drag folders (future)

Highlight dropzone

Prevent browser navigation

Reject unsupported items gracefully.

---

# MOBILE EXPERIENCE

On mobile:

Large touch targets

Bottom sheet interactions

Safe area support

Landscape support

Keyboard-safe layouts

No hover interactions.

---

# IPHONE SUPPORT

Special handling for Safari iOS.

Account for:

Memory limits

Background suspension

Camera permissions

File picker limitations

Touch gestures

Prevent accidental refresh during transfers.

Handle page visibility changes.

---

# ANDROID SUPPORT

Support:

Chrome

Samsung Internet

Firefox

Respect Android file picker behavior.

Keep transfers alive while the tab remains active.

---

# RESPONSIVE DESIGN

Design mobile-first.

Breakpoints:

Mobile

Tablet

Laptop

Desktop

Ultrawide

Avoid duplicated layouts.

Reuse components.

---

# PAIRING EXPERIENCE

Support multiple pairing methods.

Manual code

QR Code

Copy link

Paste code

Future:

Nearby discovery

Never hardcode one pairing method.

---

# QR CODE

Create QRCodeService.

Responsibilities:

Generate QR

Render SVG

Export PNG

High contrast mode

Dark mode support

Never mix QR logic with UI.

---

# QR SCANNING

Abstract scanner.

Future providers may include:

Camera API

Native scanner

External scanner

The UI should only consume:

start()

stop()

onResult()

onError()

---

# CONNECTION STATUS

Every connection should expose:

Idle

Connecting

Waiting

Negotiating

Connected

Disconnected

Failed

Retrying

Never represent connection using booleans.

---

# TRANSFER DASHBOARD

Show:

Filename

Type

Size

Peer

Speed

Average speed

Current speed

ETA

Elapsed time

Transferred bytes

Remaining bytes

Verification status

Connection quality

Transfer state

Everything updates smoothly.

Avoid excessive React renders.

---

# TRANSFER QUEUE

TransferEngine must support queueing.

Single file

Multiple files

Future folder support

Queued

Running

Paused

Completed

Failed

Cancelled

Queue operations:

Move

Remove

Pause

Resume

Retry

Clear

---

# ERROR HANDLING

Create centralized error system.

Never expose raw exceptions.

Convert into user-friendly messages.

Categorize:

Permission

Browser

Network

Protocol

Storage

Transfer

Verification

Unknown

---

# TOAST SYSTEM

Create reusable notification service.

Support:

Success

Error

Warning

Information

Progress

Auto dismiss

Manual dismiss

Queue

No alert().

---

# DIALOG SYSTEM

Reusable dialogs.

Confirmation

Error

Cancel transfer

Overwrite

Leave page

Permission

Never duplicate dialog implementations.

---

# ACCESSIBILITY

Keyboard navigation

Tab order

Focus trap

ARIA labels

Screen reader support

High contrast mode

Reduced motion support

Minimum touch size

Visible focus indicators

---

# ANIMATIONS

Use subtle animations only.

Fade

Slide

Progress

Pulse

Avoid:

Heavy transitions

Complex transforms

Large animation libraries

Animations must never reduce responsiveness.

---

# PERFORMANCE

Target:

First paint < 1 second

Initial bundle minimal

Route-based code splitting

Lazy imports

Memoization where needed

Avoid unnecessary useMemo()

Avoid unnecessary useCallback()

Prefer clean architecture over premature optimization.

---

# MEMORY MANAGEMENT

Immediately release:

ArrayBuffers

Chunks

Blob references

Event listeners

Intervals

Timers

Observers

Object URLs

PeerConnections

DataChannels

Nothing should leak after transfer completion.

---

# PAGE LIFECYCLE

Handle:

Refresh

Back button

Close tab

Visibility change

Sleep

Wake

Reconnect

Suspend

Resume

Prevent accidental transfer loss where possible.

---

# THEME SYSTEM

Support:

Light

Dark

System

Themes must use CSS variables.

Avoid hardcoded colors.

---

# INTERNATIONALIZATION

Architecture must be translation-ready.

No hardcoded text inside components.

Create localization interface even if English is the only language initially.

---

# TESTING

Design components for testing.

Unit testable

Integration testable

Mockable services

No hidden dependencies.

---

# CLEAN CODE

No duplicated components.

No duplicated hooks.

No duplicated services.

No magic numbers.

No unnecessary abstractions.

No dead code.

No TODO placeholders.

No temporary implementations.

---

# FINAL FRONTEND ACCEPTANCE

The frontend is considered complete only when:

- UI is fully responsive.
- Every service is isolated.
- Components are reusable.
- Browser capability detection is complete.
- File transfers can plug into signaling without UI changes.
- React contains no networking logic.
- React contains no transfer engine logic.
- No browser-specific hacks exist inside UI.
- No memory leaks remain.
- Architecture is scalable for future LAN discovery, folder transfer, encryption improvements, and native applications.

This frontend should represent production-quality engineering suitable for long-term maintenance and future expansion.