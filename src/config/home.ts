// Home merchandising: which Categories fill the mosaic (docs/05 section 6,
// CategoryMosaic). Eight tiles in a 4 x 3 grid: one big, one wide, six small.
export const HOME_MOSAIC = {
  big: "fruit",
  wide: "vegetables",
  small: [
    "meat-and-fish",
    "dairy-and-eggs",
    "bakery",
    "frozen",
    "pantry",
    "drinks",
  ],
} as const;

/** The Category behind "Fresh picks today". */
export const FRESH_PICKS_CATEGORY = "fruit-and-vegetables";
