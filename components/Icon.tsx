import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/cn";

interface IconProps {
  name: IconName;
  className?: string;
  filled?: boolean;
}

/** Material Symbols Outlined glyph, rendered from the self-hosted subset font. */
export function Icon({ name, className, filled }: IconProps) {
  return (
    <span aria-hidden="true" className={cn("material-symbols", filled && "icon-fill", className)}>
      {name}
    </span>
  );
}
