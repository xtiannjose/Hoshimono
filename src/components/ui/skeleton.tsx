/**
 * The one loading placeholder (docs/05: an opacity pulse of 1.2 s, still
 * under reduced motion). Hidden from screen readers; give it the shape of
 * what it stands for. Plain classes, no cn: client components use it, and
 * the merge tables would ship to every visitor.
 */
export function Skeleton({
  className = "",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={`bg-muted animate-pulse motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
}
