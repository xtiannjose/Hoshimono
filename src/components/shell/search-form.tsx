import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { localPath, type Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";

/** Plain GET form that works without JavaScript; the header SearchBox adds suggestions. */
export function SearchForm({
  id,
  lang,
  className = "",
}: {
  id: string;
  lang: Lang;
  className?: string;
}) {
  const t = MESSAGES[lang].shell;
  return (
    <form
      role="search"
      action={localPath(lang, "/search")}
      className={`rounded-pill border-input bg-card focus-within:outline-ring flex h-12 items-center gap-2.5 border px-[18px] focus-within:outline-2 focus-within:outline-offset-2 ${className}`}
    >
      <MagnifyingGlassIcon
        size={22}
        className="text-muted-foreground shrink-0"
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        {t.searchLabel}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={t.searchPlaceholder}
        autoComplete="off"
        className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none"
      />
    </form>
  );
}
