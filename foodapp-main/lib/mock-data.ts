export type MenuCategory = {
  id: string;
  name: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  available: boolean;
  prepMinutes: number;
};

export type QueueOrder = {
  id: string;
  orderType: "DINE_IN" | "DELIVERY" | "PICKUP";
  status: "ACCEPTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY";
  total: number;
  etaMinutes: number;
};

export const menuCategories: MenuCategory[] = [
  { id: "cat-starters", name: "Starters" },
  { id: "cat-mains", name: "Mains" },
  { id: "cat-drinks", name: "Drinks" },
];

export const menuItems: MenuItem[] = [
  {
    id: "item-01",
    categoryId: "cat-starters",
    name: "Smoked Tomato Soup",
    description: "Roasted tomato broth, basil cream, and crisp sourdough.",
    basePrice: 8.9,
    available: true,
    prepMinutes: 8,
  },
  {
    id: "item-02",
    categoryId: "cat-mains",
    name: "Charred Chicken Bowl",
    description: "Grilled chicken, herbed rice, citrus slaw, and yogurt sauce.",
    basePrice: 14.5,
    available: true,
    prepMinutes: 14,
  },
  {
    id: "item-03",
    categoryId: "cat-drinks",
    name: "Lime Mint Sparkler",
    description: "Fresh lime, mint syrup, sparkling water, crushed ice.",
    basePrice: 4.7,
    available: true,
    prepMinutes: 3,
  },
];

export const queueOrders: QueueOrder[] = [
  { id: "ORD-1093", orderType: "DELIVERY",   status: "PREPARING",        total: 29.30, etaMinutes: 24 },
  { id: "ORD-1094", orderType: "DINE_IN",    status: "READY",            total: 18.10, etaMinutes: 2  },
  { id: "ORD-1095", orderType: "PICKUP",     status: "ACCEPTED",         total: 12.50, etaMinutes: 15 },
  { id: "ORD-1096", orderType: "DELIVERY",   status: "OUT_FOR_DELIVERY", total: 34.75, etaMinutes: 10 },
  { id: "ORD-1097", orderType: "DINE_IN",    status: "PREPARING",        total: 22.00, etaMinutes: 18 },
  { id: "ORD-1098", orderType: "PICKUP",     status: "READY",            total: 9.90,  etaMinutes: 1  },
  { id: "ORD-1099", orderType: "DELIVERY",   status: "ACCEPTED",         total: 41.20, etaMinutes: 35 },
  { id: "ORD-1100", orderType: "DINE_IN",    status: "PREPARING",        total: 16.60, etaMinutes: 12 },
  { id: "ORD-1101", orderType: "PICKUP",     status: "ACCEPTED",         total: 8.40,  etaMinutes: 10 },
  { id: "ORD-1102", orderType: "DELIVERY",   status: "PREPARING",        total: 27.80, etaMinutes: 20 },
  { id: "ORD-1103", orderType: "DINE_IN",    status: "READY",            total: 55.00, etaMinutes: 3  },
  { id: "ORD-1104", orderType: "PICKUP",     status: "PREPARING",        total: 14.30, etaMinutes: 8  },
  { id: "ORD-1105", orderType: "DELIVERY",   status: "OUT_FOR_DELIVERY", total: 38.50, etaMinutes: 7  },
  { id: "ORD-1106", orderType: "DINE_IN",    status: "ACCEPTED",         total: 19.90, etaMinutes: 22 },
  { id: "ORD-1107", orderType: "PICKUP",     status: "READY",            total: 11.70, etaMinutes: 1  },
];
