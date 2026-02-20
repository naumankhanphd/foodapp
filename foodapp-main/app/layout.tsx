import type { Metadata } from "next";
import "./globals.css";
import { SiteHero } from "./site-hero";
import { SiteFooter } from "./site-footer";

export const metadata: Metadata = {
  title: "FoodApp",
  description: "Mobile-first food ordering and restaurant operations platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body className="antialiased">
        <SiteHero />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
