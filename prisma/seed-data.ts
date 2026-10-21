// Deterministic dev and test data (docs/04-DATA-MODEL.md section 6).
// Every id is derived from a stable key, so running the seed again updates
// rows in place instead of duplicating them. Prices are sample data.
import { createHash } from "node:crypto";

import type { PrismaClient } from "../src/generated/prisma/client";
import { productSlug as slugForProduct, slugify } from "../src/lib/slug";
import type {
  PackSizeUnit,
  StaffRole,
  Storage,
  TaxClass,
  UnitPriceBasis,
} from "../src/generated/prisma/enums";

export function seedId(key: string): string {
  const h = createHash("sha256").update(`hoshimono:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ---------- Categories: 9 top level, 32 children ----------

const TREE: Record<string, string[]> = {
  "Fruit and vegetables": ["Fruit", "Vegetables", "Herbs and aromatics"],
  "Meat and fish": ["Pork", "Chicken", "Beef", "Fish and seafood"],
  "Dairy and eggs": ["Milk", "Cheese and butter", "Eggs", "Yogurt"],
  Bakery: ["Bread", "Cakes and pastries"],
  Frozen: ["Frozen meat and seafood", "Ice cream", "Ready to cook"],
  Pantry: [
    "Rice",
    "Noodles and pasta",
    "Canned goods",
    "Sauces and condiments",
    "Cooking oil",
    "Coffee and tea",
    "Breakfast",
  ],
  Drinks: ["Water", "Juice", "Soft drinks"],
  Snacks: ["Chips", "Biscuits", "Sweets"],
  Household: ["Laundry", "Cleaning", "Paper goods"],
};

// Unprocessed food is usually VAT-exempt. Confirm with the accountant before launch.
const VAT_EXEMPT = new Set([
  "fruit",
  "vegetables",
  "herbs-and-aromatics",
  "pork",
  "chicken",
  "beef",
  "fish-and-seafood",
  "eggs",
  "rice",
]);
const CHILLED = new Set([
  "pork",
  "chicken",
  "beef",
  "fish-and-seafood",
  "milk",
  "cheese-and-butter",
  "eggs",
  "yogurt",
]);
const FROZEN = new Set([
  "frozen-meat-and-seafood",
  "ice-cream",
  "ready-to-cook",
]);

// ---------- Products: [category, name, brand, size, unit, price in centavos, flags] ----------

type Row = [
  string,
  string,
  string | null,
  number,
  PackSizeUnit,
  number,
  string?,
];

const PRODUCTS: Row[] = [
  // Fruit
  ["fruit", "Lakatan Bananas", null, 1000, "g", 9500, "weighed"],
  ["fruit", "Carabao Mangoes", null, 1000, "g", 18000, "weighed"],
  ["fruit", "Gala Apples, 4 pack", null, 4, "pc", 16500],
  ["fruit", "Calamansi", null, 250, "g", 4500],
  ["fruit", "Papaya", null, 1200, "g", 9000, "weighed"],
  ["fruit", "Pineapple", "Del Monte", 1, "pc", 11900],
  ["fruit", "Seedless Grapes", null, 500, "g", 24500],
  ["fruit", "Pomelo", null, 1, "pc", 15000],
  ["fruit", "Avocado", null, 2, "pc", 13000],
  // Vegetables
  ["vegetables", "Tomatoes", null, 500, "g", 6000, "weighed"],
  ["vegetables", "Red Onions", null, 500, "g", 9000],
  ["vegetables", "Potatoes", null, 1000, "g", 11000, "weighed"],
  ["vegetables", "Kangkong", null, 250, "g", 2500],
  ["vegetables", "Pechay", null, 250, "g", 3500],
  ["vegetables", "Eggplant", null, 500, "g", 5500, "weighed"],
  ["vegetables", "Ampalaya", null, 500, "g", 7000],
  ["vegetables", "Sitaw", null, 250, "g", 4000],
  ["vegetables", "Carrots", null, 500, "g", 6500],
  ["vegetables", "Cabbage", null, 1, "pc", 8000],
  ["vegetables", "Sayote", null, 500, "g", 3500],
  // Herbs and aromatics
  ["herbs-and-aromatics", "Garlic", null, 250, "g", 4500],
  ["herbs-and-aromatics", "Ginger", null, 250, "g", 4000],
  ["herbs-and-aromatics", "Lemongrass", null, 100, "g", 2000],
  ["herbs-and-aromatics", "Siling Labuyo", null, 50, "g", 2500],
  ["herbs-and-aromatics", "Spring Onions", null, 100, "g", 1800],
  // Pork
  ["pork", "Pork Belly (Liempo)", null, 500, "g", 19500, "weighed"],
  ["pork", "Pork Kasim", null, 500, "g", 17500, "weighed"],
  ["pork", "Ground Pork", null, 500, "g", 16000],
  ["pork", "Pork Chops", null, 500, "g", 18500, "weighed"],
  ["pork", "Pork Ribs", null, 1000, "g", 36000, "weighed"],
  // Chicken
  ["chicken", "Whole Chicken", "Magnolia", 1200, "g", 26000, "weighed"],
  ["chicken", "Chicken Thighs", "Magnolia", 1000, "g", 24000, "weighed"],
  ["chicken", "Chicken Breast Fillet", "Bounty Fresh", 500, "g", 17500],
  ["chicken", "Chicken Wings", "Bounty Fresh", 1000, "g", 22000, "weighed"],
  ["chicken", "Chicken Liver", null, 500, "g", 9000],
  // Beef
  ["beef", "Ground Beef", null, 500, "g", 24000],
  ["beef", "Beef Brisket", null, 500, "g", 29000, "weighed"],
  ["beef", "Beef Shank (Bulalo Cut)", null, 1000, "g", 46000, "weighed"],
  ["beef", "Beef Tapa Cut", null, 500, "g", 27500],
  // Fish and seafood
  ["fish-and-seafood", "Bangus, Boneless", "Sarangani Bay", 450, "g", 21500],
  ["fish-and-seafood", "Tilapia", null, 1000, "g", 16000, "weighed"],
  ["fish-and-seafood", "Galunggong", null, 500, "g", 14000, "weighed"],
  ["fish-and-seafood", "Shrimp (Suahe)", null, 500, "g", 32000, "weighed"],
  ["fish-and-seafood", "Squid", null, 500, "g", 24000, "weighed"],
  ["fish-and-seafood", "Tahong", null, 1000, "g", 12000, "weighed"],
  // Milk
  ["milk", "Fresh Milk", "Magnolia", 1000, "ml", 11500],
  ["milk", "Full Cream Milk", "Alaska", 1000, "ml", 9900],
  ["milk", "Evaporated Milk", "Alaska", 360, "ml", 4200],
  ["milk", "Condensed Milk", "Alaska", 300, "ml", 5200],
  ["milk", "Powdered Milk", "Bear Brand", 320, "g", 15500],
  ["milk", "Low Fat Milk", "Nestle", 1000, "ml", 10500],
  // Cheese and butter
  ["cheese-and-butter", "Quickmelt Cheese", "Eden", 430, "g", 23500],
  ["cheese-and-butter", "Cheddar Cheese", "Eden", 165, "g", 7500],
  ["cheese-and-butter", "Salted Butter", "Magnolia", 225, "g", 16500],
  ["cheese-and-butter", "Kesong Puti", null, 200, "g", 12000],
  // Eggs
  ["eggs", "Large Eggs, 12 pack", null, 12, "pc", 11500],
  ["eggs", "Medium Eggs, 30 pack", null, 30, "pc", 25500],
  ["eggs", "Salted Eggs, 6 pack", null, 6, "pc", 9000],
  // Yogurt
  ["yogurt", "Plain Yogurt", "Nestle", 125, "g", 4200],
  ["yogurt", "Greek Yogurt", "Magnolia", 400, "g", 18500],
  ["yogurt", "Yakult, 5 pack", "Yakult", 5, "pc", 6000],
  // Bread
  ["bread", "Pandesal, 10 pieces", null, 10, "pc", 5000],
  ["bread", "Classic White Bread", "Gardenia", 600, "g", 8800],
  ["bread", "Whole Wheat Bread", "Gardenia", 400, "g", 8500],
  ["bread", "Ensaymada, 4 pack", null, 4, "pc", 16000],
  ["bread", "Monay, 6 pieces", null, 6, "pc", 4800],
  // Cakes and pastries
  ["cakes-and-pastries", "Ube Roll", null, 1, "pc", 32000],
  ["cakes-and-pastries", "Mamon, 6 pack", "Goldilocks", 6, "pc", 21000],
  ["cakes-and-pastries", "Hopia Ube, 10 pack", "Eng Bee Tin", 10, "pc", 12000],
  ["cakes-and-pastries", "Brownies, 6 pack", null, 6, "pc", 22000],
  // Frozen meat and seafood
  ["frozen-meat-and-seafood", "Tocino", "Pampanga's Best", 450, "g", 17500],
  ["frozen-meat-and-seafood", "Longganisa", "Pampanga's Best", 450, "g", 16500],
  [
    "frozen-meat-and-seafood",
    "Chicken Nuggets",
    "Tender Juicy",
    400,
    "g",
    18000,
  ],
  ["frozen-meat-and-seafood", "Hotdogs", "Purefoods", 1000, "g", 23500],
  ["frozen-meat-and-seafood", "Frozen Shrimp, Peeled", null, 500, "g", 34500],
  // Ice cream
  ["ice-cream", "Ube Ice Cream", "Selecta", 1500, "ml", 32500],
  ["ice-cream", "Rocky Road Ice Cream", "Selecta", 1500, "ml", 32500],
  ["ice-cream", "Cookies and Cream Ice Cream", "Magnolia", 1300, "ml", 29500],
  ["ice-cream", "Mango Graham Ice Cream", "Nestle", 750, "ml", 21000],
  // Ready to cook
  ["ready-to-cook", "Lumpiang Shanghai, 20 pieces", null, 20, "pc", 19500],
  ["ready-to-cook", "Siomai, 30 pieces", null, 30, "pc", 22000],
  ["ready-to-cook", "French Fries", "McCain", 1000, "g", 26500],
  ["ready-to-cook", "Embutido", null, 500, "g", 18500],
  // Rice
  ["rice", "Jasmine Rice", "Harvester's", 5000, "g", 34000],
  ["rice", "Dinorado Rice", null, 5000, "g", 36500],
  ["rice", "Brown Rice", null, 2000, "g", 19500],
  ["rice", "Malagkit (Glutinous Rice)", null, 1000, "g", 9500],
  // Noodles and pasta
  ["noodles-and-pasta", "Pancit Canton Original", "Lucky Me!", 60, "g", 1700],
  ["noodles-and-pasta", "Instant Mami Beef", "Lucky Me!", 55, "g", 1300],
  ["noodles-and-pasta", "Spaghetti", "Royal", 900, "g", 9800],
  ["noodles-and-pasta", "Bihon", "Excellent", 454, "g", 6500],
  ["noodles-and-pasta", "Sotanghon", "Excellent", 250, "g", 5500],
  ["noodles-and-pasta", "Elbow Macaroni", "Royal", 400, "g", 5200],
  // Canned goods
  ["canned-goods", "Corned Beef", "Purefoods", 380, "g", 13500],
  ["canned-goods", "Tuna Flakes in Oil", "Century", 155, "g", 4200],
  ["canned-goods", "Sardines in Tomato Sauce", "Ligo", 155, "g", 2600],
  ["canned-goods", "Meat Loaf", "Argentina", 250, "g", 5200],
  ["canned-goods", "Fruit Cocktail", "Del Monte", 836, "g", 14500],
  ["canned-goods", "Liver Spread", "Reno", 85, "g", 3400],
  ["canned-goods", "Pork and Beans", "Hunt's", 390, "g", 4800],
  // Sauces and condiments
  ["sauces-and-condiments", "Soy Sauce", "Silver Swan", 1000, "ml", 6500],
  ["sauces-and-condiments", "Cane Vinegar", "Datu Puti", 1000, "ml", 5500],
  ["sauces-and-condiments", "Fish Sauce (Patis)", "Rufina", 750, "ml", 7500],
  ["sauces-and-condiments", "Banana Ketchup", "UFC", 550, "g", 6200],
  ["sauces-and-condiments", "Oyster Sauce", "Mama Sita's", 405, "g", 9500],
  ["sauces-and-condiments", "Tomato Sauce", "Del Monte", 250, "g", 2900],
  ["sauces-and-condiments", "Sinigang Mix", "Knorr", 40, "g", 2300],
  ["sauces-and-condiments", "Iodized Salt", null, 500, "g", 2500],
  ["sauces-and-condiments", "Brown Sugar", null, 1000, "g", 8500],
  ["sauces-and-condiments", "Mayonnaise", "Lady's Choice", 470, "ml", 15500],
  // Cooking oil
  ["cooking-oil", "Vegetable Oil", "Baguio", 1000, "ml", 11500],
  ["cooking-oil", "Coconut Oil", "Minola", 1000, "ml", 13500],
  ["cooking-oil", "Canola Oil", "Golden Fiesta", 1000, "ml", 15500],
  // Coffee and tea
  ["coffee-and-tea", "3-in-1 Coffee, 30 sachets", "Nescafe", 30, "pc", 21000],
  ["coffee-and-tea", "Instant Coffee", "Nescafe Classic", 200, "g", 22500],
  ["coffee-and-tea", "Barako Ground Coffee", null, 250, "g", 18000],
  ["coffee-and-tea", "Ginger Tea (Salabat), 10 sachets", null, 10, "pc", 9500],
  ["coffee-and-tea", "Chocolate Drink", "Milo", 600, "g", 19500],
  // Breakfast
  ["breakfast", "Rolled Oats", "Quaker", 800, "g", 18500],
  ["breakfast", "Corn Flakes", "Kellogg's", 275, "g", 15500],
  ["breakfast", "Peanut Butter", "Lily's", 340, "g", 12500],
  ["breakfast", "Coco Jam", "Pampanga's Best", 350, "g", 9500],
  // Water
  ["water", "Purified Water", "Wilkins", 1000, "ml", 2800],
  ["water", "Mineral Water, 6 pack", "Nature's Spring", 6, "pc", 9000],
  ["water", "Distilled Water, 6 L", "Wilkins", 6000, "ml", 11500],
  // Juice
  ["juice", "Mango Juice", "Del Monte", 1000, "ml", 9500],
  ["juice", "Orange Juice", "Minute Maid", 1000, "ml", 11000],
  ["juice", "Calamansi Juice, 10 pack", "Zesto", 10, "pc", 7500],
  ["juice", "Buko Juice", null, 1000, "ml", 12000],
  // Soft drinks
  ["soft-drinks", "Cola", "Coca-Cola", 1500, "ml", 8500],
  ["soft-drinks", "Lemon Lime Soda", "Sprite", 1500, "ml", 8000],
  ["soft-drinks", "Iced Tea Apple", "C2", 500, "ml", 3200],
  ["soft-drinks", "Root Beer", "A&W", 330, "ml", 4200],
  // Chips
  ["chips", "Potato Chips Original", "Jack 'n Jill", 60, "g", 4200],
  ["chips", "Cheese Rings", "Oishi", 60, "g", 2500],
  ["chips", "Chicharon", null, 100, "g", 6500],
  ["chips", "Banana Chips", null, 200, "g", 7500],
  // Biscuits
  ["biscuits", "Crackers, 10 packs", "SkyFlakes", 10, "pc", 7800],
  ["biscuits", "Wafer Sticks", "Rebisco", 200, "g", 6500],
  ["biscuits", "Cream Sandwich, 10 packs", "Rebisco", 10, "pc", 7000],
  ["biscuits", "Butter Cookies", "Danisa", 454, "g", 32500],
  // Sweets
  ["sweets", "Polvoron, 12 pieces", "Goldilocks", 12, "pc", 15500],
  ["sweets", "Yema, 10 pieces", null, 10, "pc", 9000],
  ["sweets", "Chocolate Bar", "Goya", 110, "g", 9500],
  ["sweets", "Pastillas de Leche, 20 pieces", null, 20, "pc", 12000],
  // Laundry
  ["laundry", "Laundry Powder", "Tide", 2000, "g", 31500],
  ["laundry", "Fabric Conditioner", "Downy", 1500, "ml", 29500],
  ["laundry", "Bleach", "Zonrox", 1000, "ml", 6500],
  ["laundry", "Bar Detergent, 4 pack", "Champion", 4, "pc", 9500],
  // Cleaning
  ["cleaning", "Dishwashing Liquid", "Joy", 790, "ml", 17500],
  ["cleaning", "Multi-Surface Cleaner", "Mr. Muscle", 500, "ml", 15500],
  ["cleaning", "Sponge Scourer, 3 pack", "Scotch-Brite", 3, "pc", 8500],
  // Paper goods
  ["paper-goods", "Bathroom Tissue, 12 rolls", "Sanicare", 12, "pc", 26500],
  ["paper-goods", "Paper Towels, 2 rolls", "Tisyu", 2, "pc", 11500],
  ["paper-goods", "Facial Tissue, 3 boxes", "Kleenex", 3, "pc", 18500],
];

// Edge cases the storefront must show (data model section 6).
const OUT_OF_STOCK = "ube-roll";
const LOW_STOCK = ["carabao-mangoes", "beef-shank-bulalo-cut"];

// ---------- Delivery ----------

const HUB = {
  id: seedId("hub:pasig"),
  name: "Pasig Hub",
  address: "Ortigas Avenue Extension, Pasig City",
  lat: 14.5794,
  lng: 121.0859,
};

const ZONES = [
  {
    key: "pasig-mandaluyong",
    name: "Pasig and Mandaluyong",
    cities: ["Pasig", "Mandaluyong"],
    barangays: [],
    deliveryFeeCents: 4900,
    freeDeliveryOverCents: 150000,
    minOrderCents: 50000,
  },
  {
    key: "makati-taguig",
    name: "Makati and Taguig",
    cities: ["Makati", "Taguig"],
    barangays: [],
    deliveryFeeCents: 6900,
    freeDeliveryOverCents: 200000,
    minOrderCents: 70000,
  },
  {
    key: "quezon-city-south",
    name: "Quezon City South",
    cities: ["Quezon City"],
    barangays: ["Ugong Norte", "Bagumbayan", "Libis", "Blue Ridge A"],
    deliveryFeeCents: 7900,
    freeDeliveryOverCents: 250000,
    minOrderCents: 80000,
  },
];

// Delivery Slots in Manila local time (UTC+8, no daylight saving).
const SLOT_START_HOURS = [8, 10, 12, 14, 16, 18];
const SLOT_HOURS = 2;
const SLOT_CAPACITY = 20;
const SLOT_DAYS = 7;
const MANILA_OFFSET_HOURS = 8;

// ---------- People ----------

// Signed in as <key>@hoshimono.test. "tech" is the technical test account:
// an admin, so it sees every staff screen (docs/06 section 6).
const STAFF: { key: string; role: StaffRole; name: string; phone?: string }[] =
  [
    { key: "admin", role: "admin", name: "Rafael Cruz" },
    { key: "merchandiser", role: "merchandiser", name: "Joanna Lim" },
    { key: "editor", role: "content_editor", name: "Bea Navarro" },
    { key: "picker", role: "picker", name: "Arnel Bautista" },
    { key: "dispatcher", role: "dispatcher", name: "Marites Aquino" },
    { key: "tech", role: "admin", name: "Hoshimono Tech" },
    {
      key: "rider",
      role: "rider",
      name: "Jun Dela Rosa",
      phone: "+639171234599",
    },
  ];

// Recipes and an Article from seeded Products (ADR 0013). Each ingredient:
// [Product slug or null, label, note, count for the servings, scales, at home].
type SeedIngredient = [string | null, string, string, number, boolean, boolean];
const RECIPES: {
  key: string;
  title: string;
  intro: string;
  servings: number;
  prep: number;
  cook: number;
  featured?: boolean;
  ingredients: SeedIngredient[];
  steps: string[];
}[] = [
  {
    key: "chicken-adobo",
    title: "Chicken Adobo",
    intro:
      "The one everyone grew up with: chicken braised in soy sauce, vinegar and lots of garlic. Better the next day.",
    servings: 4,
    prep: 10,
    cook: 45,
    featured: true,
    ingredients: [
      [
        "magnolia-chicken-thighs",
        "",
        "cut into serving pieces",
        1,
        true,
        false,
      ],
      ["silver-swan-soy-sauce", "", "1/2 cup", 1, false, false],
      ["datu-puti-cane-vinegar", "", "1/3 cup", 1, false, false],
      ["garlic", "", "1 whole head, crushed", 1, false, true],
      ["red-onions", "", "1 medium, sliced", 1, false, true],
      ["baguio-vegetable-oil", "", "2 tablespoons", 1, false, true],
      ["harvesters-jasmine-rice", "", "to serve", 1, false, true],
      [null, "Water", "1 cup", 1, false, false],
    ],
    steps: [
      "Mix the chicken with the soy sauce and half the garlic. Leave it for 30 minutes if you have time.",
      "Heat the oil in a pot. Brown the rest of the garlic and the onion, then the chicken, skin side down.",
      "Pour in the marinade, the vinegar and the water. Bring to a boil without stirring, so the vinegar cooks off.",
      "Cover and simmer for 30 to 35 minutes, until the chicken is tender and the sauce has thickened.",
      "Serve hot with rice.",
    ],
  },
  {
    key: "sinigang-na-baboy",
    title: "Sinigang na Baboy",
    intro:
      "Sour tamarind soup with pork and vegetables, for a rainy afternoon or any day at all.",
    servings: 6,
    prep: 15,
    cook: 75,
    ingredients: [
      ["pork-kasim", "", "cut into cubes", 2, true, false],
      ["knorr-sinigang-mix", "", "1 pack", 1, true, false],
      ["tomatoes", "", "2, quartered", 1, false, false],
      ["red-onions", "", "1, quartered", 1, false, true],
      ["eggplant", "", "sliced", 1, false, false],
      ["sitaw", "", "cut into 2-inch pieces", 1, false, false],
      ["kangkong", "", "leaves and tender stems", 1, true, false],
      ["rufina-fish-sauce-patis", "", "to taste", 1, false, true],
      [null, "Water", "2 liters", 1, false, false],
    ],
    steps: [
      "Boil the pork, tomatoes and onion in the water. Skim off the scum, then simmer for an hour until tender.",
      "Stir in the sinigang mix. Add the eggplant and sitaw and cook for 5 minutes.",
      "Add the kangkong, turn off the heat and season with fish sauce.",
    ],
  },
  {
    key: "pancit-bihon",
    title: "Pancit Bihon",
    intro:
      "Rice noodles with chicken and vegetables. Long noodles for a long life, so it shows up at every birthday.",
    servings: 6,
    prep: 20,
    cook: 25,
    ingredients: [
      ["excellent-bihon", "", "soaked in water for 10 minutes", 1, true, false],
      [
        "bounty-fresh-chicken-breast-fillet",
        "",
        "boiled and shredded",
        1,
        true,
        false,
      ],
      ["cabbage", "", "shredded", 1, false, false],
      ["carrots", "", "cut into strips", 1, false, false],
      ["silver-swan-soy-sauce", "", "1/4 cup", 1, false, true],
      ["garlic", "", "4 cloves, minced", 1, false, true],
      ["red-onions", "", "1, sliced", 1, false, true],
      ["calamansi", "", "to serve", 1, false, false],
    ],
    steps: [
      "Saute the garlic and onion, then the chicken.",
      "Add the carrots and cabbage and cook until just tender. Take half out for the top.",
      "Pour in 2 cups of the chicken broth and the soy sauce. Bring to a boil.",
      "Add the drained noodles and toss until they soak up the broth.",
      "Top with the vegetables you took out. Serve with calamansi.",
    ],
  },
];

const ARTICLES = [
  {
    key: "stocking-a-filipino-pantry",
    title: "Stocking a Filipino pantry",
    intro:
      "Five bottles and a sack of rice cover most of the week. Here is what to keep on the shelf.",
    sections: [
      {
        heading: "The sour and the salty",
        text: "Soy sauce, vinegar and fish sauce are the base of adobo, paksiw, sinigang and most dipping sauces. Buy the liter bottles: they keep for months.",
      },
      {
        heading: "Garlic, onions and oil",
        text: "Almost every dish starts with garlic and onions in hot oil. Keep them in a cool, dry place, not the fridge.",
      },
      {
        heading: "Rice",
        text: "A 5-kilo bag lasts a family of four about a week. Store it sealed, away from the stove.",
      },
    ],
    products: [
      "silver-swan-soy-sauce",
      "datu-puti-cane-vinegar",
      "rufina-fish-sauce-patis",
      "garlic",
      "red-onions",
      "baguio-vegetable-oil",
      "harvesters-jasmine-rice",
    ],
  },
];

const CUSTOMERS = [
  // The client test account: a Customer ready to order (docs/06 section 6).
  {
    key: "client",
    name: "Mara Santos",
    email: "client@hoshimono.test",
    phone: "+639171234504",
    zone: "pasig-mandaluyong",
    address: {
      label: "Home",
      line1: "8 Camia Street",
      barangay: "Kapitolyo",
      city: "Pasig",
      landmark: "Yellow house beside the chapel",
    },
  },
  {
    key: "ligaya",
    name: "Ligaya Dimaculangan",
    email: "ligaya@example.com",
    phone: "+639171234501",
    zone: "pasig-mandaluyong",
    address: {
      label: "Home",
      line1: "12 Sampaguita Street",
      barangay: "Kapitolyo",
      city: "Pasig",
      landmark: "Across the green sari-sari store",
    },
  },
  {
    key: "paolo",
    name: "Paolo Villanueva",
    email: "paolo@example.com",
    phone: "+639171234502",
    zone: "makati-taguig",
    address: {
      label: "Condo",
      line1: "Unit 1804, 28th Street",
      barangay: "Fort Bonifacio",
      city: "Taguig",
      landmark: "Lobby B, near the guardhouse",
    },
  },
  {
    key: "teresita",
    name: "Teresita Ong",
    email: "teresita@example.com",
    phone: "+639171234503",
    zone: "quezon-city-south",
    address: {
      label: "Home",
      line1: "45 Calle Industria",
      barangay: "Bagumbayan",
      city: "Quezon City",
      landmark: "Blue gate beside the bakery",
    },
  },
];

// ---------- Helpers ----------

function basisFor(unit: PackSizeUnit): UnitPriceBasis {
  return unit === "g" ? "per_100g" : unit === "ml" ? "per_litre" : "per_piece";
}

function storageFor(category: string): Storage {
  if (FROZEN.has(category)) return "frozen";
  if (CHILLED.has(category)) return "chilled";
  return "ambient";
}

function taxFor(category: string): TaxClass {
  return VAT_EXEMPT.has(category) ? "vat_exempt" : "vatable";
}

/** Stable pseudo-random integer in [min, max] for a key. */
function stableInt(key: string, min: number, max: number): number {
  const n = parseInt(
    createHash("sha256").update(key).digest("hex").slice(0, 8),
    16
  );
  return min + (n % (max - min + 1));
}

function manilaToday(now: Date): { y: number; m: number; d: number } {
  const manila = new Date(now.getTime() + MANILA_OFFSET_HOURS * 3_600_000);
  return {
    y: manila.getUTCFullYear(),
    m: manila.getUTCMonth(),
    d: manila.getUTCDate(),
  };
}

export const productSlug = slugForProduct;

// What a child aisle's Products also answer to (categories.search_words):
// the parent's name, or for a two-topic parent the topic no child is named
// after. "Fruit and vegetables" lends nothing: both topics are children.
const PARENT_WORDS: Record<string, string> = {
  "Meat and fish": "meat",
  "Dairy and eggs": "dairy",
  Bakery: "bakery",
  Frozen: "frozen",
  Pantry: "pantry",
  Drinks: "drinks",
  Snacks: "snacks",
  Household: "household",
};
// Named for the parent's other topic, so the lent word would mislead.
const OWN_TOPIC = new Set(["Fish and seafood", "Eggs"]);

// ---------- Seed ----------

export async function seedDatabase(db: PrismaClient, now = new Date()) {
  // Categories
  let topOrder = 0;
  for (const [parentName, children] of Object.entries(TREE)) {
    const parentSlug = slugify(parentName);
    const parent = {
      id: seedId(`category:${parentSlug}`),
      slug: parentSlug,
      name: parentName,
      sortOrder: topOrder++,
      parentId: null,
    };
    await db.category.upsert({
      where: { id: parent.id },
      create: parent,
      update: parent,
    });
    for (const [i, childName] of children.entries()) {
      const slug = slugify(childName);
      const child = {
        id: seedId(`category:${slug}`),
        slug,
        name: childName,
        sortOrder: i,
        parentId: parent.id,
        searchWords: OWN_TOPIC.has(childName)
          ? null
          : (PARENT_WORDS[parentName] ?? null),
      };
      await db.category.upsert({
        where: { id: child.id },
        create: child,
        update: child,
      });
    }
  }

  // Hub and Zones
  await db.hub.upsert({ where: { id: HUB.id }, create: HUB, update: HUB });
  for (const { key, ...zone } of ZONES) {
    const data = { id: seedId(`zone:${key}`), hubId: HUB.id, ...zone };
    await db.zone.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  // Products and stock
  for (const [
    category,
    name,
    brand,
    size,
    unit,
    priceCents,
    flags,
  ] of PRODUCTS) {
    const slug = productSlug(brand, name);
    const isWeighed = flags === "weighed";
    const product = {
      id: seedId(`product:${slug}`),
      slug,
      name,
      brand,
      categoryId: seedId(`category:${category}`),
      packSizeValue: size,
      packSizeUnit: unit,
      unitPriceBasis: basisFor(unit),
      priceCents,
      taxClass: taxFor(category),
      isWeighed,
      storage: storageFor(category),
      status: "active" as const,
    };
    await db.product.upsert({
      where: { id: product.id },
      create: product,
      update: product,
    });

    const onHand =
      slug === OUT_OF_STOCK
        ? 0
        : LOW_STOCK.includes(slug)
          ? 3
          : stableInt(`stock:${slug}`, 12, 80);
    const stock = { productId: product.id, hubId: HUB.id, onHand, reserved: 0 };
    await db.stockLevel.upsert({
      where: { productId_hubId: { productId: product.id, hubId: HUB.id } },
      create: stock,
      update: stock,
    });
  }

  // The weekly schedule the cron tick makes Slots from (ADR 0012): every
  // day, the same windows as the Slots below.
  for (let weekday = 0; weekday < 7; weekday++) {
    for (const hour of SLOT_START_HOURS) {
      const template = {
        hubId: HUB.id,
        weekday,
        startMinute: hour * 60,
        endMinute: (hour + SLOT_HOURS) * 60,
        capacity: SLOT_CAPACITY,
      };
      await db.slotTemplate.upsert({
        where: {
          hubId_weekday_startMinute: {
            hubId: HUB.id,
            weekday,
            startMinute: template.startMinute,
          },
        },
        create: template,
        update: {},
      });
    }
  }

  // Slots for the next 7 days, Manila local time
  const today = manilaToday(now);
  for (let day = 0; day < SLOT_DAYS; day++) {
    const date = new Date(Date.UTC(today.y, today.m, today.d + day));
    for (const hour of SLOT_START_HOURS) {
      const startsAt = new Date(
        Date.UTC(today.y, today.m, today.d + day, hour - MANILA_OFFSET_HOURS)
      );
      const endsAt = new Date(startsAt.getTime() + SLOT_HOURS * 3_600_000);
      const slot = {
        id: seedId(`slot:${HUB.id}:${startsAt.toISOString()}`),
        hubId: HUB.id,
        date,
        startsAt,
        endsAt,
        capacity: SLOT_CAPACITY,
      };
      // Never reset `booked`: dev data may already hold Orders in these Slots.
      await db.slot.upsert({
        where: { id: slot.id },
        create: slot,
        update: {},
      });
    }
  }

  // Staff
  for (const { key, role, name, phone } of STAFF) {
    const staff = {
      id: seedId(`staff:${key}`),
      email: `${key}@hoshimono.test`,
      name,
      role,
      phone: phone ?? null,
    };
    await db.staff.upsert({
      where: { id: staff.id },
      create: staff,
      update: staff,
    });
  }

  // Recipes and Articles, published (ADR 0013)
  for (const [i, r] of RECIPES.entries()) {
    const recipe = {
      id: seedId(`recipe:${r.key}`),
      slug: r.key,
      title: r.title,
      intro: r.intro,
      servings: r.servings,
      prepMinutes: r.prep,
      cookMinutes: r.cook,
      steps: r.steps,
      status: "published" as const,
      featured: r.featured ?? false,
      publishedAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
    };
    await db.recipe.upsert({
      where: { id: recipe.id },
      create: recipe,
      update: recipe,
    });
    await db.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    await db.recipeIngredient.createMany({
      data: r.ingredients.map(
        ([slug, label, note, quantity, scales, optional], position) => ({
          recipeId: recipe.id,
          productId: slug ? seedId(`product:${slug}`) : null,
          label: label || null,
          note,
          quantity,
          scales,
          optional,
          position,
        })
      ),
    });
  }
  for (const a of ARTICLES) {
    const article = {
      id: seedId(`article:${a.key}`),
      slug: a.key,
      title: a.title,
      intro: a.intro,
      sections: a.sections,
      status: "published" as const,
      publishedAt: now,
    };
    await db.article.upsert({
      where: { id: article.id },
      create: article,
      update: article,
    });
    await db.articleProduct.deleteMany({ where: { articleId: article.id } });
    await db.articleProduct.createMany({
      data: a.products.map((slug, position) => ({
        articleId: article.id,
        productId: seedId(`product:${slug}`),
        position,
      })),
    });
  }

  // Customers with one Address each
  for (const c of CUSTOMERS) {
    const customer = {
      id: seedId(`customer:${c.key}`),
      name: c.name,
      email: c.email,
      phone: c.phone,
    };
    await db.customer.upsert({
      where: { id: customer.id },
      create: customer,
      update: customer,
    });
    const address = {
      id: seedId(`address:${c.key}`),
      customerId: customer.id,
      zoneId: seedId(`zone:${c.zone}`),
      isDefault: true,
      ...c.address,
    };
    await db.address.upsert({
      where: { id: address.id },
      create: address,
      update: address,
    });
  }
}
