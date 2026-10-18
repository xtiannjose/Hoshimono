import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

const LINKS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/import", label: "Import and export" },
];

// Dense admin screens: same tokens, no Motion (docs/05 section 9).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="wrap py-6">
      <nav
        aria-label="Admin"
        className="border-border mb-6 flex flex-wrap gap-1 border-b"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center border-b-2 border-transparent px-3 font-semibold"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
