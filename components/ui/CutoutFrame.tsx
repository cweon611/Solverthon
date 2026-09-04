import { Img } from "./Img";

// 3D cutout frame — white card with shadow + cropped photo, simulating a product render card
// design/BridgePage.tsx 192–202행 그대로
export function CutoutFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#F5F6F8] shadow-xl shadow-black/10 ${className ?? ""}`}>
      <Img src={src} alt={alt} className="w-full h-full object-cover object-top scale-105" />
      {/* rim light — simulates 3D separation from bg */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/40 to-transparent" />
    </div>
  );
}
