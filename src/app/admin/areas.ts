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
  stock: [
    {
      href: "/admin/stock",
      label: "Stock",
      hint: "Receive deliveries, record shrink and counts, see what is low",
    },
  ],
  reports: [
    {
      href: "/admin/report",
      label: "Daily report",
      hint: "Orders, revenue, fill rate, late deliveries",
    },
  ],
  setup: [
    {
      href: "/admin/setup",
      label: "Zones and Slots",
      hint: "Delivery fees, the weekly Slot schedule, one Slot at a time",
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
  promotions: [
    {
      href: "/admin/promotions",
      label: "Promotions",
      hint: "Sale prices on Products and Categories, for set dates",
    },
    {
      href: "/admin/vouchers",
      label: "Vouchers",
      hint: "Codes for money off or free delivery, with limits",
    },
  ],
  content: [
    {
      href: "/admin/recipes",
      label: "Recipes",
      hint: "Write, publish and feature Recipes",
    },
    {
      href: "/admin/articles",
      label: "Articles",
      hint: "Tips and guides, with Products to buy",
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
