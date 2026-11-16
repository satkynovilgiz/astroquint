import { Hero } from "@/components/home/hero";
import { WorldsPreview } from "@/components/home/worlds-preview";
import { PageTransition } from "@/components/layout/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <div>
        <Hero />
        <WorldsPreview />
      </div>
    </PageTransition>
  );
}
