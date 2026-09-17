import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import { loginAction } from "@/lib/actions/auth";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  keyword: "Log in",
  description: "Log in to Client Systems, the SOP Mojo client onboarding workspace.",
  path: "/login",
  index: false,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <MarketingHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-muted">
          Operator access for your Client Systems workspace.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error}
          </p>
        ) : null}
        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={params.next || "/app"} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              required
              name="email"
              type="email"
              className="w-full rounded-md border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              required
              name="password"
              type="password"
              className="w-full rounded-md border border-line bg-white px-3 py-2"
            />
          </label>
          <button className="w-full rounded-sm bg-lime px-4 py-2 font-semibold text-lime-ink">
            Log in
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          No workspace yet?{" "}
          <Link href="/signup" className="text-forest underline">
            Create one
          </Link>
        </p>
      </div>
      <MarketingFooter />
    </>
  );
}
