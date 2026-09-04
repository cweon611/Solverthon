"use client";

// design/BridgePage.tsx 180–190행 그대로. 외부(Unsplash) URL이므로 next/image 대신 img 유지(§4.2).
export function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
