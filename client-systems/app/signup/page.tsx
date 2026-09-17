import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import { signupAction } from "@/lib/actions/auth";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  keyword: "Create workspace",
  description: "Create a Client Systems workspace for SOP Mojo client onboarding.",
  path: "/signup",
  index: false,
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <MarketingHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">Create a workspace</h1>
        <p className="mt-2 text-sm text-muted">
          One workspace per buyer account. If your email was invited, you join
          that workspace instead of creating a new one.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {params.error}
          </p>
        ) : null}
        <form action={signupAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input name="name" className="w-full rounded-md border border-line bg-white px-3 py-2" />
          </label>
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
            <span className="mb-1 block font-medium">Password (8+ characters)</span>
            <input
              required
              minLength={8}
              name="password"
              type="password"
              className="w-full rounded-md border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Workspace name</span>
            <input
              name="workspaceName"
              placeholder="Acme delivery"
              className="w-full rounded-md border border-line bg-white px-3 py-2"
            />
          </label>
          <button className="w-full rounded-sm bg-lime px-4 py-2 font-semibold text-lime-ink">
            Create workspace
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already have access?{" "}
          <Link href="/login" className="text-forest underline">
            Log in
          </Link>
        </p>
      </div>
      <MarketingFooter />
    </>
  );
}
