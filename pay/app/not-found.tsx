import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <h1 className="font-display text-4xl font-semibold">Not found</h1>
      <Link href="/" className="mt-4 inline-flex min-h-12 items-center text-lime">
        Back to products
      </Link>
    </div>
  );
}
