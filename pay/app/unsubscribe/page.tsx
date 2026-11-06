import { confirmUnsubscribe } from "@/app/unsubscribe/actions";
import { readUnsubscribeToken } from "@/lib/can-spam";
import { privateMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = privateMetadata("Unsubscribe | SOP Mojo");

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const query = await searchParams;
  const done = query.done === "1";
  const token = query.token?.trim() ?? "";
  const email = token ? readUnsubscribeToken(token) : null;
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">Unsubscribe</h1>
        {done ? (
          <p className="mt-4 text-base leading-7 text-zinc-200" role="status">
            You&apos;re unsubscribed.
          </p>
        ) : query.error === "rate" ? (
          <p className="mt-4 text-base leading-7 text-zinc-200">Too many requests. Try again in a few minutes.</p>
        ) : !email ? (
          <p className="mt-4 text-base leading-7 text-zinc-200">This unsubscribe link is not valid.</p>
        ) : (
          <>
            <p className="mt-4 text-base leading-7 text-zinc-200">
              Confirm and we will stop marketing email to {email}.
            </p>
            <form action={confirmUnsubscribe} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-sm bg-lime px-4 text-base font-semibold text-lime-ink"
              >
                Unsubscribe
              </button>
            </form>
          </>
        )}
      </article>
    </div>
  );
}
