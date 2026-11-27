import { AccountForm } from "@/components/AccountForm";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Update card | SOP Mojo Pay");

export default function AccountPage() {
  return <AccountForm />;
}
