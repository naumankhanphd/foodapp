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
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHero />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
