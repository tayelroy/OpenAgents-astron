"use client";

import Navigation from "@/sections/Navigation";
import Hero from "@/sections/Hero";
import HowItWorks from "@/sections/HowItWorks";
import LiveAgents from "@/sections/LiveAgents";
import Footer from "@/sections/Footer";

export default function HomePage() {
  return (
    <div style={{ background: "#02030A", minHeight: "100vh", overflowX: "hidden" }}>
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <LiveAgents />
        <Footer />
      </main>
    </div>
  );
}
