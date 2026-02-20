const tiles = [
  { label: "Live Queue", value: "7 active orders" },
  { label: "Kitchen Load", value: "Moderate" },
  { label: "Delivery Riders", value: "3 on route" },
  { label: "Today Sales", value: "$1,482.90" },
];

export default function StaffDashboardPage() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <article key={tile.label} className="panel p-4">
          <p className="text-xs uppercase tracking-wide">{tile.label}</p>
          <p className="mt-2 text-xl font-semibold">{tile.value}</p>
        </article>
      ))}
    </section>
  );
}

