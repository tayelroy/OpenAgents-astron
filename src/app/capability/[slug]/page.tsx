"use client";

import { use } from "react";
import CapabilityDetail from "@/sections/CapabilityDetail";

export default function CapabilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <CapabilityDetail slug={slug} />;
}
