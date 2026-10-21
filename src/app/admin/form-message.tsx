"use client";

/** A form's first error, or "Saved." once it worked. */
export function FormMessage({
  state,
}: {
  state: { errors: Record<string, string>; saved?: boolean };
}) {
  const message = Object.values(state.errors)[0];
  if (message) {
    return (
      <p role="alert" className="text-err text-sm font-semibold">
        {message}
      </p>
    );
  }
  return state.saved ? (
    <p role="status" className="text-sm font-semibold">
      Saved.
    </p>
  ) : null;
}
