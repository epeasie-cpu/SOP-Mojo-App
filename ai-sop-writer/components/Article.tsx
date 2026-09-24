import type { ContentEntry } from "@/lib/content";
import { Breadcrumbs } from "./Breadcrumbs";

export function ArticleSections({ entry }: { entry: ContentEntry }) {
  return (
    <div className="prose-sop">
      {entry.lede ? <p className="lede">{entry.lede}</p> : null}
      {entry.sections?.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2>{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function PageHeader({ entry }: { entry: ContentEntry }) {
  return (
    <header className="mb-10">
      <Breadcrumbs path={entry.path} />
      <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-lime uppercase">
        AI SOP Writer
      </p>
      <h1 className="font-display mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        {entry.heading}
      </h1>
    </header>
  );
}
