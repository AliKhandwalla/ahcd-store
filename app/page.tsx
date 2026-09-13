import AccentStrip from "@/components/AccentStrip";
import BenefitsStrip from "@/components/BenefitsStrip";
import FoodGallery from "@/components/FoodGallery";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import ProductSection from "@/components/ProductSection";
import StorySection from "@/components/StorySection";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AccentStrip />
        <ProductSection />
        <BenefitsStrip />
        <FoodGallery />
        <StorySection />
      </main>
      <Footer />
    </>
  );
}
