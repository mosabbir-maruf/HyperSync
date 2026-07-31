import { useState } from "react"
import {
  ShieldIcon,
  BoltIcon,
  RadarIcon,
  MonitorIcon,
} from "../components/ui/icons"

export function About() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      q: "How does HyperSync transfer files?",
      a: "HyperSync opens a direct WebRTC peer connection between two browsers and streams files over a data channel in small chunks. The signaling backend only exchanges connection details (SDP + ICE) during setup, then gets out of the way entirely.",
    },
    {
      q: "Is there any privacy risk or tracking?",
      a: "No accounts, no uploads, and no cloud copies. Bytes flow peer-to-peer from one device to another, and the signaling backend never sees your files. There is zero telemetry and zero analytics.",
    },
    {
      q: "Does it work without internet?",
      a: "Devices on the same local network are discovered automatically, and the transfer itself streams directly over your Wi-Fi or LAN. Files never need to travel through the public internet.",
    },
    {
      q: "How fast is the transfer?",
      a: "Because data bypasses internet bottlenecks and streams directly device-to-device, transfers run at the maximum speed your local network can handle. Files stream in chunks with backpressure so buffers never overflow.",
    },
    {
      q: "Which devices are supported?",
      a: "Any device with a modern web browser — macOS, Windows, Linux, iOS, and Android. No apps to download, no accounts to create, and no permissions to grant. Just open the URL and start transferring.",
    },
    {
      q: "Are large files handled well?",
      a: "Yes. Files are sliced into chunks and streamed with live progress, pause, resume, and retry. Large files never load fully into memory.",
    },
    {
      q: "Is HyperSync free and open source?",
      a: "Yes. HyperSync is completely free and open source. The code is available on GitHub for audit and collaboration.",
    },
  ]
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:px-8">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">HyperSync</span>
            <span className="h-px w-8 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              About
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            File transfer that stays <br />
            <span className="text-[#cf4322]">between devices.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
            HyperSync moves files straight from one device to another over an
            encrypted WebRTC channel. No accounts, no uploads, and no cloud
            copies.
          </p>
        </div>
      </section>

      {/* Philosophy Grid */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              Philosophy
            </h2>
            <span className="h-px flex-1 bg-border-strong" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <RadarIcon width={24} height={24} />,
                title: "Discover",
                desc: "Devices on the same network appear automatically. Tap one to connect — no codes to type unless you want to.",
              },
              {
                icon: <BoltIcon width={24} height={24} />,
                title: "Transfer",
                desc: "Files stream in small chunks with live progress, pause, resume, and retry. Large files never load fully into memory.",
              },
              {
                icon: <ShieldIcon width={24} height={24} />,
                title: "Private",
                desc: "Bytes flow peer-to-peer. The signaling backend only relays connection setup — it never sees your files.",
              },
            ].map((feature, index) => (
              <div key={index} className="group bg-background p-8 md:p-12">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-strong bg-card text-foreground">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture List */}
      <section id="architecture" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <span className="h-px flex-1 bg-border-strong" />
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              Architecture
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong sm:grid-cols-3">
            {[
              [
                "01",
                "Signaling",
                "A lightweight backend exchanges connection details (SDP + ICE) so two browsers can find a direct path.",
              ],
              [
                "02",
                "Peer connection",
                "The browsers open a direct RTCPeerConnection and a data channel — no server sits in the middle.",
              ],
              [
                "03",
                "Transfer",
                "Files are sliced into chunks and streamed over the channel with backpressure, so buffers never overflow.",
              ],
            ].map(([step, t, d]) => (
              <div key={t} className="bg-background p-8 md:p-12">
                <div className="mb-8 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Phase {step}
                </div>
                <h3 className="mb-3 text-2xl font-black tracking-tight">{t}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Card */}
      <section id="maker" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              The Maker
            </h2>
            <span className="h-px flex-1 bg-border-strong" />
          </div>

          {/* Card Container */}
          <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-background p-8 md:p-12 lg:p-16">
            {/* ambient glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
            {/* corner ticks */}
            <span className="absolute left-4 top-4 h-2 w-2 border-l border-t border-border-strong" />
            <span className="absolute right-4 top-4 h-2 w-2 border-r border-t border-border-strong" />
            <span className="absolute bottom-4 left-4 h-2 w-2 border-b border-l border-border-strong" />
            <span className="absolute bottom-4 right-4 h-2 w-2 border-b border-r border-border-strong" />

            <div className="relative z-10 flex flex-col gap-12 lg:flex-row lg:items-center">
              {/* Left Side */}
              <div className="flex flex-1 items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <img
                    src="/mosabbir-maruf.webp"
                    alt="Mosabbir Maruf"
                    className="pointer-events-none h-full w-full select-none rounded-2xl border border-border-strong object-cover"
                    draggable={false}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background"
                    title="Verified"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-label="Verified"
                    >
                      <path
                        fill="#1d9bf0"
                        d="M12 2.5l2.36 1.7 2.9-.02 1.68 2.36 2.86.65-.02 2.9.65 2.86-2.36 1.68-.02 2.9-2.9-.02L14.36 22 12 20.3 9.64 22l-1.68-2.36-2.9.02-.02-2.9-2.36-1.68.65-2.86-.02-2.9 2.86-.65L7.28 4.18l2.9.02z"
                      />
                      <path
                        fill="#fff"
                        d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z"
                      />
                    </svg>
                  </span>
                </div>
                <div>
                  <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Designed & Built By
                  </div>
                  <h3 className="mb-1 text-2xl font-black tracking-tight">
                    Mosabbir Maruf
                  </h3>
                  <a
                    href="https://github.com/mosabbir-maruf"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
                    </svg>
                    @mosabbir-maruf
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden h-32 w-px bg-border-strong lg:block" />
              <div className="block h-px w-full bg-border-strong lg:hidden" />

              {/* Right Side */}
              <div className="flex flex-1 flex-col justify-center lg:pl-4">
                <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                  Built with a focus on speed, privacy, and absolute simplicity.
                  For support, feedback, or to see more of my work, connect with
                  me on GitHub.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://github.com/mosabbir-maruf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View on GitHub
                  </a>
                  <a
                    href="https://github.com/mosabbir-maruf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-border-strong bg-background px-6 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-muted"
                  >
                    Follow Profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              FAQ
            </h2>
            <span className="h-px flex-1 bg-border-strong" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx
              return (
                <div
                  key={idx}
                  className="bg-background transition-colors duration-300"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="group flex w-full cursor-pointer items-center justify-between gap-6 p-6 text-left transition-colors hover:bg-card sm:p-10"
                  >
                    <div className="flex items-start gap-4 sm:items-center sm:gap-8">
                      <span className="label-mono mt-1 w-6 shrink-0 text-primary sm:mt-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-base font-bold tracking-tight transition-colors duration-300 sm:text-xl ${
                          isOpen
                            ? "text-primary"
                            : "text-foreground group-hover:text-primary"
                        }`}
                      >
                        {faq.q}
                      </span>
                    </div>
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong transition-all duration-300 ${
                        isOpen
                          ? "rotate-180 border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
                      }`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-10 pl-[4.5rem] pr-6 sm:pl-[6.5rem] sm:pr-12">
                        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Legal & Privacy */}
      <section
        id="privacy"
        className="relative bg-background pt-16 pb-24 md:pt-24 md:pb-32"
      >
        <div id="terms" className="absolute top-0" />
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong sm:grid-cols-2">
            {/* Privacy Policy */}
            <div className="bg-background p-8 md:p-12">
              <div className="mb-6 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Privacy Policy
              </div>
              <h3 className="mb-3 text-xl font-black tracking-tight">
                Zero-Data Architecture
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                HyperSync does not collect, store, or transmit any personal
                data. We do not use cookies, trackers, or analytics. Your files
                are transferred directly between your devices via WebRTC and
                never touch our servers. The signaling server temporarily holds
                connection data (IP addresses and ICE candidates) solely to
                establish the peer-to-peer connection and discards it
                immediately.
              </p>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-background p-8 md:p-12">
              <div className="mb-6 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                Terms & Conditions
              </div>
              <h3 className="mb-3 text-xl font-black tracking-tight">
                Usage Terms
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                HyperSync is provided "as is", without warranty of any kind. By
                using HyperSync, you agree to take full responsibility for the
                files you transfer. We are not liable for any data loss,
                damages, or legal issues arising from your use of the
                application. The service operates exclusively via direct
                peer-to-peer connections.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
