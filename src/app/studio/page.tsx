import { StudioCanvas } from "@/components/studio/StudioCanvas";

export default function StudioPage() {
  return (
    <main
      className="w-screen h-screen overflow-hidden text-white"
      style={{ background: '#02030A' }}
    >
      <StudioCanvas />
    </main>
  );
}
