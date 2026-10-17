import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

/** Plain GET form: works without JavaScript; Batch 1.3 adds suggestions. */
export function SearchForm({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  return (
    <form
      role="search"
      action="/search"
      className={`rounded-pill border-input bg-card focus-within:outline-ring flex h-12 items-center gap-2.5 border px-[18px] focus-within:outline-2 focus-within:outline-offset-2 ${className}`}
    >
      <MagnifyingGlassIcon
        size={22}
        className="text-muted-foreground shrink-0"
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        Search groceries
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search groceries and brands"
        autoComplete="off"
        className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none"
      />
    </form>
  );
}
