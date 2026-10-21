/** The seeded test accounts (docs/06 section 6) and where each one lands. */
export const TEST_ACCOUNTS = [
  { label: "Admin", email: "admin@hoshimono.test", next: "/admin" },
  { label: "Technical", email: "tech@hoshimono.test", next: "/admin" },
  { label: "Client", email: "client@hoshimono.test", next: "/" },
  { label: "Picker", email: "picker@hoshimono.test", next: "/admin/pick" },
  {
    label: "Dispatcher",
    email: "dispatcher@hoshimono.test",
    next: "/admin/dispatch",
  },
  { label: "Rider", email: "rider@hoshimono.test", next: "/admin/deliveries" },
] as const;
