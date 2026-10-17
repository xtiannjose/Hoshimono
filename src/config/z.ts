// The only z-index scale. Use via style={{ zIndex: z.header }}, never ad-hoc numbers.
export const z = {
  base: 0,
  sticky: 10,
  header: 20,
  drawer: 30,
  modal: 40,
  toast: 50,
} as const;
