import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">404</p>
      <h1 className="font-display mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-zinc-400">
        That URL is not part of Flowchart Studio. Head back to the canvas and map a process.
      </p>
      <p className="mt-6">
        <Link href="/" className="font-semibold text-lime hover:underline">
          Open Flowchart Studio
        </Link>
      </p>
    </div>
  );
}
