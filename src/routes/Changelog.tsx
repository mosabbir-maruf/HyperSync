import { Link } from "react-router-dom"
import changelogData from "../data/changelog.json"

export function Changelog() {
  // Group changes by type
  const groupByType = (changes: { type: string; description: string }[]) => {
    return changes.reduce((acc, change) => {
      const type = change.type.toLowerCase()
      if (!acc[type]) acc[type] = []
      acc[type].push(change)
      return acc
    }, {} as Record<string, typeof changes>)
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[40vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:px-8">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">HyperSync</span>
            <span className="h-px w-8 bg-border-strong" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Updates
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            Changelog
          </h1>
          <p className="mx-auto max-w-xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
            Stay up to date with the latest features, improvements, and bug fixes in HyperSync.
          </p>
        </div>
      </section>

      {/* Timeline Entries */}
      <section className="bg-background pb-24 md:pb-32">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="relative">
            {/* Timeline Vertical Line (Desktop) */}
            <div className="absolute left-[16px] top-4 bottom-0 w-px bg-border-strong md:left-[200px]" />

            <div className="flex flex-col gap-12 md:gap-0">
              {changelogData.map((release, index) => {
                const groupedChanges = groupByType(release.changes)
                
                return (
                  <div
                    key={release.version}
                    className="relative pl-12 md:pl-0 flex flex-col md:flex-row md:gap-12"
                  >
                    {/* Left Column: Version & Date */}
                    <div className="relative shrink-0 md:w-[200px] md:text-right md:pr-12 md:py-4">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[32px] top-[24px] md:left-auto md:-right-[5px] md:top-[28px] h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                      
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1">
                        <h2 className="text-2xl font-black tracking-tight">
                          v{release.version}
                        </h2>
                        {index === 0 && (
                          <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
                            Latest
                          </span>
                        )}
                      </div>
                      <time className="mt-1 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {release.date}
                      </time>
                    </div>

                    {/* Right Column: Changes */}
                    <div className="relative flex-1 md:py-4 md:pl-4 pb-12 md:pb-20">
                      {release.title && (
                        <h3 className="mb-6 text-xl font-bold tracking-tight text-foreground/90">
                          {release.title}
                        </h3>
                      )}

                      <div className="flex flex-col gap-8">
                        {Object.entries(groupedChanges).map(([type, changes]) => {
                          // Define colors based on change type
                          const typeColors: Record<string, string> = {
                            added: 'text-success',
                            fixed: 'text-primary',
                            changed: 'text-warning',
                          }
                          const colorClass = typeColors[type] || 'text-muted-foreground'

                          return (
                            <div key={type} className="flex flex-col gap-3">
                              <h4 className={`font-mono text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
                                {type}
                              </h4>
                              <ul className="flex flex-col gap-3">
                                {changes.map((change, i) => (
                                  <li key={i} className="text-sm leading-relaxed text-muted-foreground flex items-start gap-3">
                                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border-strong" />
                                    <span>{change.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
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
