import type { StaffArea } from "@/modules/identity";

/** The staff screens in each area, for the admin menu and home. */
export const AREA_LINKS: Record<
  StaffArea,
  { href: string; label: string; hint: string }[]
> = {
  picking: [
    {
      href: "/admin/pick",
      label: "Picking",
      hint: "Orders to pick, each in aisle order",
    },
  ],
  dispatch: [
    {
      href: "/admin/dispatch",
      label: "Dispatch",
      hint: "Send picked Orders out with a Rider",
    },
    {
      href: "/admin/cash",
      label: "Cash",
      hint: "Count each Rider's cash at day's end",
    },
  ],
  delivery: [
    {
      href: "/admin/deliveries",
      label: "My deliveries",
      hint: "The Orders you are carrying",
    },
  ],
  orders: [
    {
      href: "/admin/orders",
      label: "Orders",
      hint: "The queue: find an Order, move it along, add notes",
    },
  ],
  catalog: [
    {
      href: "/admin/products",
      label: "Products",
      hint: "Edit, add photos, change status",
    },
    {
      href: "/admin/categories",
      label: "Categories",
      hint: "Rename, move, reorder, search words",
    },
    {
      href: "/admin/import",
      label: "Import and export",
      hint: "Products as CSV",
    },
  ],
  refunds: [
    {
      href: "/admin/refunds",
      label: "Refunds to check",
      hint: "Refunds PayMongo did not clearly confirm",
    },
  ],
  staff: [
    {
      href: "/admin/staff",
      label: "Staff",
      hint: "Add people, change roles, switch accounts off",
    },
  ],
  audit: [
    {
      href: "/admin/audit",
      label: "Audit log",
      hint: "Who changed what, and when",
    },
  ],
};
