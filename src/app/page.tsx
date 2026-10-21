import { Hero } from "@/components/landing/hero";
import { ClosingCta, Deliveries, HowItWorks, Patterns, Rules, Tools } from "@/components/landing/sections";
import { SiteFooter } from "@/components/site-chrome";
import { RULES } from "@/lib/rules";

export default function Home() {
  return (
    <main className="bg-bg">
      <Hero />
      <Deliveries />
      <Patterns />
      <HowItWorks />
      <Rules rules={RULES} />
      <Tools />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}
