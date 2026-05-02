"use client";

import { use } from "react";
import Navigation from "@/sections/Navigation";
import CapabilityDetail from "@/sections/CapabilityDetail";
import Footer from "@/sections/Footer";

export default function CapabilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  
  return (
    <div style={{ background: "#02030A", minHeight: "100vh", overflowX: "hidden" }}>
      <Navigation />
      <main>
        <CapabilityDetail slug={slug} />
        <Footer />
      </main>
    </div>
  );
}
