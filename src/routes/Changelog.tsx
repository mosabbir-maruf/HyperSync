import { useState } from "react"
import { Link } from "react-router-dom"
import changelogData from "../data/changelog.json"

export function Changelog() {
  const [expandedVersions, setExpandedVersions] = useState<string[]>(
    [changelogData[0]?.version, changelogData[1]?.version].filter(
      Boolean,
    ) as string[],
  )

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) =>
      prev.includes(version)
        ? prev.filter((v) => v !== version)
        : [...prev, version],
    )
  }

  const groupByType = (changes: { type: string; description: string }[]) => {
    return changes.reduce(
      (acc, change) => {
        const type = change.type.toLowerCase()
        if (!acc[type]) acc[type] = []
        acc[type].push(change)
        return acc
      },
      {} as Record<string, typeof changes>,
    )
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-8 pb-12 text-center sm:px-8">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">HyperSync</span>
            <span className="h-px w-8 bg-border-strong" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Updates
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            Project <br />
            <span className="text-[#cf4322]">Changelog.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
            Stay up to date with the latest features, improvements, and bug
            fixes in HyperSync.
          </p>
        </div>
      </section>

      {/* Timeline Entries */}
      <section className="bg-background mt-10 pb-24 md:pb-32">
        <div className="mx-auto max-w-[1273px] px-6 md:px-12">
          <div className="relative">
            {/* Timeline Vertical Line (Desktop) */}
            <div className="absolute left-[16px] top-4 bottom-0 w-px bg-border-strong md:left-[200px]" />

            <div className="flex flex-col gap-6 md:gap-0">
              {changelogData.map((release, index) => {
                const groupedChanges = groupByType(release.changes)
                const isOpen = expandedVersions.includes(release.version)

                return (
                  <div
                    key={release.version}
                    className="relative pl-12 md:pl-0 flex flex-col md:flex-row gap-3 md:gap-12 group cursor-pointer"
                    onClick={() => toggleVersion(release.version)}
                  >
                    {/* Left Column: Version & Date */}
                    <div className="relative shrink-0 md:w-[200px] md:text-right md:pr-12 md:py-4">
                      {/* Timeline Dot */}
                      {index === changelogData.length - 1 ? (
                        <div className="absolute -left-[37px] top-[23px] md:left-auto md:-right-[6px] md:top-[27px] h-3 w-3 rounded-full bg-primary ring-4 ring-background shadow-[0_0_10px_rgba(207,67,34,0.5)]" />
                      ) : (
                        <div
                          className={`absolute -left-[35px] top-[25px] md:left-auto md:-right-[4px] md:top-[29px] h-2 w-2 rounded-full border-2 bg-background ring-4 ring-background transition-colors duration-300 ${
                            isOpen ? "border-primary" : "border-border-strong"
                          }`}
                        />
                      )}

                      <div className="flex w-full flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 md:gap-1">
                        <div className="flex items-center md:items-end gap-3 md:gap-1 flex-row md:flex-col">
                          <h2
                            className={`text-2xl font-black tracking-tight transition-colors duration-300 ${
                              isOpen || index === changelogData.length - 1
                                ? "text-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            v{release.version}
                          </h2>
                          {index === changelogData.length - 1 && (
                            <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
                              Latest
                            </span>
                          )}
                        </div>
                        {/* Mobile Arrow */}
                        <div
                          className={`md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            isOpen
                              ? "rotate-180 border-primary bg-primary text-primary-foreground"
                              : "border-transparent text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
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
                      </div>
                      <time className="mt-1 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {release.date}
                      </time>
                    </div>

                    {/* Right Column: Changes Accordion */}
                    <div className="relative flex-1 md:py-4 md:pl-4 pb-8 md:pb-12">
                      <div className="flex w-full items-center justify-between text-left transition-colors">
                        {release.title ? (
                          <h3
                            className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                              isOpen || index === 0
                                ? "text-foreground/90"
                                : "text-foreground/50 group-hover:text-foreground/90"
                            }`}
                          >
                            {release.title}
                          </h3>
                        ) : (
                          <span className="text-xl font-bold tracking-tight text-transparent">
                            No title
                          </span>
                        )}
                        {/* Desktop Arrow */}
                        <div
                          className={`hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            isOpen
                              ? "rotate-180 border-primary bg-primary text-primary-foreground"
                              : "border-transparent text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"
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
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex flex-col gap-8 pt-6 pb-4">
                            {Object.entries(groupedChanges).map(
                              ([type, changes]) => {
                                const typeColors: Record<string, string> = {
                                  added: "text-success",
                                  fixed: "text-primary",
                                  changed: "text-warning",
                                  security: "text-[#cf4322]",
                                }
                                const colorClass =
                                  typeColors[type] || "text-muted-foreground"

                                return (
                                  <div
                                    key={type}
                                    className="flex flex-col gap-3"
                                  >
                                    <h4
                                      className={`font-mono text-[10px] font-bold uppercase tracking-widest ${colorClass}`}
                                    >
                                      {type}
                                    </h4>
                                    <ul className="flex flex-col gap-3">
                                      {changes.map((change, i) => (
                                        <li
                                          key={i}
                                          className="text-sm leading-relaxed text-muted-foreground flex items-start gap-3"
                                        >
                                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border-strong" />
                                          <span>{change.description}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
