import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** Inner pages (playground, rules, docs) share the site header and footer; the landing page has its own hero nav. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
