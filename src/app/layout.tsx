import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { OfflineBanner, ServiceWorker } from "@/components/connection";
import "./globals.css";

const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Paani Register",
  description: "Water supply register: bottles, payments and balances.",
  applicationName: "Paani Register",
  appleWebApp: { capable: true, title: "Paani", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false }, // amounts like 1,00,000 must not turn into phone links
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#112129" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <OfflineBanner />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
