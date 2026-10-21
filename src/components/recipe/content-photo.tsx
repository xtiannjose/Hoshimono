import { CookingPotIcon, NewspaperIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";

/** A Recipe's or Article's photo, cropped to its box; an icon until one is added. */
export function ContentPhoto({
  url,
  alt,
  kind,
  sizes,
  priority = false,
  className = "",
}: {
  url: string | null;
  alt: string;
  kind: "recipe" | "article";
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const Icon = kind === "recipe" ? CookingPotIcon : NewspaperIcon;
  return (
    <div className={`photo-slot relative overflow-hidden ${className}`}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <Icon size={48} className="opacity-70" aria-hidden />
      )}
    </div>
  );
}
