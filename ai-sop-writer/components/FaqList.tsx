import type { FaqItem } from "@/lib/content";

export function FaqList({ faqs }: { faqs: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-4">
          <summary className="cursor-pointer list-none font-semibold text-ink">
            <span className="flex items-start justify-between gap-4">
              {faq.question}
              <span className="text-muted group-open:hidden">+</span>
              <span className="hidden text-muted group-open:inline">−</span>
            </span>
          </summary>
          <p className="mt-2 max-w-3xl text-muted">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
