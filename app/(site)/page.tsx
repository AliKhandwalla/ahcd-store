import AccentStrip from "@/components/AccentStrip";
import BenefitsStrip from "@/components/BenefitsStrip";
import FoodGallery from "@/components/FoodGallery";
import Hero from "@/components/Hero";
import LatestUpdates from "@/components/LatestUpdates";
import ProductSection from "@/components/ProductSection";
import StorySection from "@/components/StorySection";

// Navbar and Footer now live in app/layout.tsx so every route shares the
// AHCD chrome and the auth-aware navbar.
export default function Home() {
  return (
    <>
      <Hero />
      <AccentStrip />
      <ProductSection />
      <BenefitsStrip />
      <FoodGallery />
      <StorySection />
      <LatestUpdates />
    </>
  );
}
