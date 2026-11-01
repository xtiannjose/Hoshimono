"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SignOutForm } from "@/components/sign-out-form";
import { ICON_BUTTON } from "@/components/ui/button-classes";

export type MenuGroup = {
  label: string;
  links: { href: string; label: string }[];
};

const ITEM =
  "rounded-field text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_0_0_1px_var(--border)] flex min-h-10 items-center px-3 text-sm font-semibold";

/**
 * The staff menu (ADR 0018): always open beside the page from lg up, a
 * menu button on phones. One <nav>, so it is read once.
 */
export function AdminMenu({
  groups,
  staff,
}: {
  groups: MenuGroup[];
  staff: { name: string; role: string } | null;
}) {
  const path = usePathname();
  // The page the phone menu was opened on: following a link closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const current = (href: string) =>
    path === href || (href !== "/admin" && path.startsWith(`${href}/`));

  return (
    <>
      {groups.length > 0 && (
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : path)}
          aria-expanded={open}
          aria-controls="admin-menu"
          className={`${ICON_BUTTON} absolute top-3 right-3 lg:hidden`}
        >
          {open ? (
            <XIcon size={22} aria-hidden />
          ) : (
            <ListIcon size={22} aria-hidden />
          )}
          <span className="sr-only">Menu</span>
        </button>
      )}
      <div
        id="admin-menu"
        className={`${open ? "grid" : "hidden"} gap-5 pt-4 lg:grid lg:flex-1 lg:content-between lg:pt-6`}
      >
        <nav aria-label="Admin" className="grid gap-4">
          {groups.map((g) => (
            <div key={g.label} className="grid gap-0.5">
              <h2 className="text-muted-foreground px-3 pb-1 text-xs font-bold">
                {g.label}
              </h2>
              {g.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={current(l.href) ? "page" : undefined}
                  className={ITEM}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {staff && (
          <div className="border-border grid gap-1 border-t pt-4">
            <p className="px-3 text-sm">
              <b className="block">{staff.name}</b>
              <span className="text-muted-foreground">{staff.role}</span>
            </p>
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-wrap">
                <Link href="/" className={ITEM}>
                  View shop
                </Link>
                <SignOutForm>
                  <button type="submit" className={ITEM}>
                    Sign out
                  </button>
                </SignOutForm>
              </div>
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
