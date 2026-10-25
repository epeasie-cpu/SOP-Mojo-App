import { QmsFrame } from "@/components/QmsFrame";
import { QmsTool } from "@/components/QmsTool";
import { QMS_DOC_POINTS, QMS_GAP_ORDER } from "@/lib/qms-score";
import {
  QMS_ARTICLE_URL,
  QMS_FAQ,
  QMS_NOT_A_CERTIFICATION,
  QMS_SEO_H1,
  QMS_STARTER_KIT_URL,
  qmsFaqJsonLd,
  qmsSoftwareJsonLd,
} from "@/lib/qms-page";

const SCORE_LABEL: Record<(typeof QMS_GAP_ORDER)[number], string> = {
  written: "How many core processes are written down",
  home: "Where SOPs live",
  review: "Whether documents have a version or review",
  corrective: "Whether nonconformances and corrective actions are tracked",
  training: "How training is done",
};

export function QmsLanding({ error }: { error: string | null }) {
  return (
    <QmsFrame>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qmsSoftwareJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qmsFaqJsonLd()) }} />
        <p className="text-xs font-semibold tracking-[0.18em] text-[#C1FF72] uppercase">SOP Mojo</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-50">{QMS_SEO_H1}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-300">
          A 2-minute Quality System Fit Check. Answer nine questions and see a tool-category recommendation, a 0–100 process documentation score, and the largest gaps. The 30-day action plan is emailed.
        </p>
        <QmsTool initialError={error} />
        <article className="mt-12 grid gap-10 text-base leading-7 text-zinc-300">
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">What this check is</h2>
            <p className="mt-3">
              Quality management software is a place to keep SOPs, inspections, training records, and corrective actions. It is not the same as having those processes written down. This check asks which of three fits is closer: a simple SOP and checklist system, a field inspection app, or a compliance-grade QMS.
            </p>
            <p className="mt-3">{QMS_NOT_A_CERTIFICATION}</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Three fits</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-zinc-100">A. Simple SOP and checklist system.</span> The work is not regulated, and people are not running inspections away from a desk.
              </li>
              <li>
                <span className="font-semibold text-zinc-100">B. Field inspection app.</span> People inspect or record work on site, and the industry is not regulated or audited.
              </li>
              <li>
                <span className="font-semibold text-zinc-100">C. Compliance-grade QMS.</span> A regulator, customer, or auditor requires a quality system. Documented SOPs are still the foundation. This page does not name a vendor.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">How the score is calculated</h2>
            <p className="mt-3">The process documentation score adds five answers. Team size, industry, field work, and the main pain do not change it.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {QMS_GAP_ORDER.map((id) => (
                <li key={id}>
                  {SCORE_LABEL[id]}: up to {Math.max(...Object.values(QMS_DOC_POINTS[id]))} points.
                </li>
              ))}
            </ul>
            <p className="mt-3">The largest gaps are the two or three answers that left the most points unused.</p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Questions</h2>
            <div className="mt-4 grid gap-6">
              {QMS_FAQ.map((item) => (
                <div key={item.question}>
                  <h3 className="text-lg font-semibold text-zinc-50">{item.question}</h3>
                  <p className="mt-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-2xl font-semibold text-zinc-50">Keep going</h2>
            <p className="mt-3">
              <a className="text-[#C1FF72] underline" href={QMS_ARTICLE_URL}>
                Read the quality management software guide
              </a>
              . For a free set of SOP templates, use the{" "}
              <a className="text-[#C1FF72] underline" href={QMS_STARTER_KIT_URL}>
                SOP Starter Kit
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </QmsFrame>
  );
}
