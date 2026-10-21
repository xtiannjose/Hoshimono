/**
 * The most of one Product a Cart line can hold (CRT-2 stepper limit). Here,
 * not only in pricing, so browser components can read it without pulling in
 * module code that talks to the database.
 */
export const MAX_LINE_QUANTITY = 99;
