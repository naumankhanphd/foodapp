import { NextResponse } from "next/server";

const offers = [
  {
    id: "offer-01",
    name: "Weekday Lunch",
    type: "PERCENTAGE",
    value: 10,
    appliesTo: "DINE_IN",
  },
  {
    id: "offer-02",
    name: "Evening Delivery",
    type: "FREE_DELIVERY",
    value: 0,
    appliesTo: "DELIVERY",
  },
];

export async function GET() {
  return NextResponse.json({ offers });
}

