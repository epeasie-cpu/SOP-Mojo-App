import { LoginForm } from "@/components/LoginForm";
import { privateMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = privateMetadata("Sign in | SOP Mojo Pay");

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <LoginForm error={query.error} />;
}
