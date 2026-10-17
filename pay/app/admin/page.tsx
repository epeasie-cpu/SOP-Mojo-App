import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ADMIN_COOKIE, readSession } from "@/lib/admin-session";
import { createCatalogStore } from "@/lib/catalog-store";
import { privateMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = privateMetadata("Catalog | SOP Mojo Pay");

export default async function AdminPage() {
  const jar = await cookies();
  const session = readSession(jar.get(ADMIN_COOKIE)?.value, process.env);
  if (!session) redirect("/admin/login");
  const snapshot = await createCatalogStore().read();
  return <AdminDashboard initial={snapshot} email={session.email} />;
}
