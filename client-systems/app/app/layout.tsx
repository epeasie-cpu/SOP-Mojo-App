import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { requireWorkspace } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects | Client Systems | SOP Mojo",
  ...noIndexMetadata,
};

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { user, workspace } = await requireWorkspace();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader email={user.email} workspaceName={workspace.name} />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
