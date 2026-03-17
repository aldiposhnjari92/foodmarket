import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/contexts/language-context";
import { RoleProvider } from "@/contexts/role-context";

import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Food Market",
  description: "Scan and manage your food inventory",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  authors: [{ name: "Aldi Psohnjari", url: "https://foodmarket-kl3a.vercel.app" }],
  icons: {
  icon: [
    { url: "/logo.svg", type: "image/svg+xml", sizes: "32x32" },
  ]
}
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <Analytics/>
        <SpeedInsights/>
        <LanguageProvider>
          <RoleProvider>{children}</RoleProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
