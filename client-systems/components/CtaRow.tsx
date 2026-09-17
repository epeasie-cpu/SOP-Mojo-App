import { BUILDER_CTA_URL, WRITER_CTA_URL, kitCheckoutUrl } from "@/lib/site";

function KitLink({ className }: { className: string }) {
  const href = kitCheckoutUrl();
  const external = href !== "#";
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      Get the $39 Kit
    </a>
  );
}

export function LandingCtas({
  tone = "dark",
}: {
  tone?: "dark" | "hero";
}) {
  const secondary =
    tone === "hero"
      ? "rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
      : "rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime";
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href="/signup"
        className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
      >
        Start free in Client Systems
      </a>
      <KitLink className={secondary} />
      <a href={WRITER_CTA_URL} className={secondary}>
        AI SOP Writer
      </a>
      <a href={BUILDER_CTA_URL} className={secondary}>
        SOP Builder Pro
      </a>
    </div>
  );
}

export function CtaRow() {
  return (
    <section className="rounded-xl bg-black px-6 py-8 text-white">
      <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
        After yes
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold">
        Start free in the workspace. Get the $39 Kit. Bridge to Writer and Builder Pro.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/75">
        Client Systems is the client path after yes — proposal, welcome, onboard.
        It is not SOP Writer and not a Notion or ClickUp template marketplace.
      </p>
      <div className="mt-6">
        <LandingCtas />
      </div>
    </section>
  );
}
