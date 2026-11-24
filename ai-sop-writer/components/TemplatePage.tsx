import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqList } from "@/components/FaqList";
import { Generator } from "@/components/Generator";
import { JsonLd, PageShell } from "@/components/JsonLd";
import { SopDraftProvider } from "@/components/SopDraftContext";
import { TemplateLeadForm } from "@/components/TemplateLeadForm";
import type { ContentEntry } from "@/lib/content";
import { builderTryUrl, emailFooterLines, SITE, STARTER_KIT_URL, WRITER_UPGRADE_URL } from "@/lib/site";
import { relatedTemplates } from "@/lib/templates";

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-zinc-300">
          <span aria-hidden="true" className="mt-1 inline-block h-4 w-4 shrink-0 rounded-sm border border-zinc-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function TemplatePage({ entry }: { entry: ContentEntry }) {
  const related = relatedTemplates(entry);
  const slug = entry.slug ?? "";
  return (
    <PageShell className="py-12">
      <JsonLd entry={entry} />
      <header className="mb-8">
        <Breadcrumbs path={entry.path} />
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-lime uppercase">
          {entry.industry ?? "SOP template"}
        </p>
        <h1 className="font-display mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          {entry.heading}
        </h1>
        {entry.lede ? <p className="mt-4 max-w-2xl text-lg text-zinc-300">{entry.lede}</p> : null}
        <p className="mt-4 max-w-2xl rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {SITE.banner}
        </p>
      </header>
      <SopDraftProvider>
        <Generator
          defaults={entry.prefill}
          templateSlug={slug}
          submitLabel={entry.topicLabel ? `Write my ${entry.topicLabel} SOP` : undefined}
          variants={entry.variants}
        />
        <article id="template" className="sop-document mt-12">
          <h2 className="font-display text-2xl font-semibold text-zinc-50">The template</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Read it here. Nothing on this page is locked behind an email.
          </p>
          {entry.sections?.map((section) => (
            <section key={section.heading} className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">{section.heading}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="mt-2 max-w-2xl text-zinc-400">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          {entry.purpose ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Purpose</h3>
              <p className="mt-2 max-w-2xl text-zinc-300">{entry.purpose}</p>
            </section>
          ) : null}
          {entry.scope ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Scope</h3>
              <p className="mt-2 max-w-2xl text-zinc-300">{entry.scope}</p>
            </section>
          ) : null}
          {entry.roles?.length ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Roles</h3>
              <ul className="mt-2 list-disc pl-5 text-zinc-300">
                {entry.roles.map((role) => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {entry.prefill?.trigger ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Trigger</h3>
              <p className="mt-2 max-w-2xl text-zinc-300">{entry.prefill.trigger}</p>
            </section>
          ) : null}
          {entry.extraLists?.map((list) => (
            <section key={list.heading} className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">{list.heading}</h3>
              <Checklist items={list.items} />
            </section>
          ))}
          {entry.templateSteps?.length ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Steps</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  <caption className="sr-only">{entry.heading} steps</caption>
                  <thead>
                    <tr className="border-b border-zinc-700 text-zinc-400">
                      <th className="py-2 pr-3 font-semibold">Step</th>
                      <th className="py-2 pr-3 font-semibold">Owner</th>
                      <th className="py-2 font-semibold">Standard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.templateSteps.map((step, index) => (
                      <tr key={step.step} className="border-b border-zinc-800 align-top text-zinc-300">
                        <td className="py-3 pr-3 text-zinc-100">
                          <span className="text-zinc-500">{index + 1}. </span>
                          {step.step}
                        </td>
                        <td className="py-3 pr-3">{step.owner}</td>
                        <td className="py-3 text-zinc-400">{step.standard}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {entry.checklist?.length ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">
                {entry.checklistLabel ?? "Checklist"}
              </h3>
              <Checklist items={entry.checklist} />
            </section>
          ) : null}
          {entry.exceptions?.length ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Exceptions</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-300">
                {entry.exceptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {entry.records ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Records and sign-off</h3>
              <p className="mt-2 max-w-2xl text-zinc-300">{entry.records}</p>
            </section>
          ) : null}
          {entry.reviewCadence ? (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-zinc-100">Review cadence</h3>
              <p className="mt-2 max-w-2xl text-zinc-300">{entry.reviewCadence}</p>
            </section>
          ) : null}
        </article>
        {entry.customize?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-zinc-50">
              What to customize for your business
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-300">
              {entry.customize.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <TemplateLeadForm slug={slug} footerLines={emailFooterLines()} />
      </SopDraftProvider>
      <section className="mt-12 rounded-lg border border-zinc-700 bg-zinc-900 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-semibold text-zinc-50">Roll it out to your team</h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          A file in a downloads folder is still a file. After the process owner reviews this
          draft, SOP Builder Pro keeps a named owner on it, attaches the KPI you want to watch,
          and stores the next revision when the work changes. The team opens the current version.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={builderTryUrl(slug)}
            data-try-builder=""
            data-template-slug={slug}
            className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink hover:bg-lime/90"
          >
            Try Builder free
          </a>
          <a
            href={WRITER_UPGRADE_URL}
            className="rounded-sm border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime"
          >
            Get Builder Pro
          </a>
          <a
            href={STARTER_KIT_URL}
            className="rounded-sm border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime"
          >
            SOP Starter Kit
          </a>
        </div>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-zinc-50">Related templates</h2>
        <ul className="mt-4 space-y-2">
          {related.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="font-medium text-lime hover:underline">
                {item.keyword}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/how-to-write-an-sop" className="font-medium text-lime hover:underline">
              How to Write an SOP
            </Link>
          </li>
        </ul>
      </section>
      {entry.faqs?.length ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-zinc-50">FAQ</h2>
          <div className="mt-4">
            <FaqList faqs={entry.faqs} />
          </div>
        </section>
      ) : null}
      <section className="no-print mt-12 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-8">
        <h2 className="font-display text-2xl font-semibold text-zinc-50">
          Write the draft, then keep the version the team uses.
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={builderTryUrl(slug)}
            data-try-builder=""
            data-template-slug={slug}
            className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink hover:bg-lime/90"
          >
            Try Builder free
          </a>
          <a
            href={WRITER_UPGRADE_URL}
            className="rounded-sm border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime"
          >
            Get Builder Pro
          </a>
          <a
            href={STARTER_KIT_URL}
            className="rounded-sm border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime"
          >
            SOP Starter Kit
          </a>
        </div>
      </section>
    </PageShell>
  );
}
