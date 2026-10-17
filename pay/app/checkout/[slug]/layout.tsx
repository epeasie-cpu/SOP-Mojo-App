import { checkoutMetadata } from "@/lib/seo";

export const metadata = checkoutMetadata("Checkout | SOP Mojo");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
