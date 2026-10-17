"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { importCsv, type ImportState } from "../actions";

const initial: ImportState = { status: "idle" };

/** Upload a CSV; nothing is saved unless every row is valid. */
export function ImportForm() {
  const [state, action, pending] = useActionState(importCsv, initial);
  return (
    <div className="grid gap-5">
      <form
        action={action}
        className="rounded-card border-border bg-card grid max-w-xl gap-3 border p-4"
      >
        <label htmlFor="file" className="text-sm font-semibold">
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking and importing..." : "Import Products"}
          </Button>
        </div>
      </form>

      {state.status === "done" && (
        <p
          role="status"
          className="rounded-field bg-accent-soft max-w-xl px-4 py-3 font-semibold"
        >
          Imported: {state.created} new, {state.updated} updated. The shop shows
          them now.
        </p>
      )}
      {state.status === "failed" && (
        <section role="alert" aria-labelledby="report-h" className="grid gap-3">
          <h2 id="report-h" className="type-h3">
            Nothing was imported. Fix these{" "}
            {state.errors.length === 1 ? "problem" : "problems"} and try again.
          </h2>
          <div className="rounded-card border-border bg-card overflow-x-auto border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Row
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Column
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Problem
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.errors.map((e, i) => (
                  <tr key={i} className="border-border border-t">
                    <td className="px-4 py-2 tabular-nums">{e.row}</td>
                    <td className="px-4 py-2 font-mono text-[13px]">
                      {e.field}
                    </td>
                    <td className="px-4 py-2">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
