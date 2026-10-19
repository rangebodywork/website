import Image from "next/image";
import { cn } from "@/lib/cn";

/** Practitioner headshot: face-centred 512px square crop of the original studio photo. */
export const PORTRAIT = "/images/practitioner.jpg";

interface AvatarProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
  eager?: boolean;
}

export function Avatar({ src, alt, size, className, eager }: AvatarProps) {
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-full bg-surface-container", className)}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={alt} fill sizes={`${size * 2}px`} className="object-cover" loading={eager ? "eager" : undefined} />
    </span>
  );
}
