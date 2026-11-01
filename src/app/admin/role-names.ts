import type { StaffRole } from "@/generated/prisma/enums";

/** A Staff role in words, for the menu and lists (docs/05 section 9). */
export const ROLE_NAME: Record<StaffRole, string> = {
  admin: "Admin",
  merchandiser: "Merchandiser",
  content_editor: "Content Editor",
  dispatcher: "Dispatcher",
  picker: "Picker",
  rider: "Rider",
};
