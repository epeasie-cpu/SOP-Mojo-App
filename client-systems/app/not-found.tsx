import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted">That page is not in Client Systems.</p>
      <Link href="/" className="mt-6 text-sm text-forest underline">
        Back to home
      </Link>
    </div>
  );
}
