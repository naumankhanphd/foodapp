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
  {
    id: "ORD-1093",
    orderType: "DELIVERY",
    status: "PREPARING",
    total: 29.3,
    etaMinutes: 24,
  },
  {
    id: "ORD-1094",
    orderType: "DINE_IN",
    status: "READY",
    total: 18.1,
    etaMinutes: 2,
  },
];
