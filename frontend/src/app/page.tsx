import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Hero } from "@/components/marketing/Hero";
import { Mechanism } from "@/components/marketing/Mechanism";
import { Market } from "@/components/marketing/Market";
import { Guarantees } from "@/components/marketing/Guarantees";
import { Provenance } from "@/components/marketing/Provenance";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Mechanism />
        <Market />
        <Guarantees />
        <Provenance />
      </main>
      <SiteFooter />
    </>
  );
}
