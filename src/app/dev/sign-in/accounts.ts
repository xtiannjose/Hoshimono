/** The seeded test accounts (docs/06 section 6) and where each one lands. */
export const TEST_ACCOUNTS = [
  { label: "Admin", email: "admin@hoshimono.test", next: "/admin" },
  { label: "Technical", email: "tech@hoshimono.test", next: "/admin" },
  { label: "Client", email: "client@hoshimono.test", next: "/" },
] as const;
