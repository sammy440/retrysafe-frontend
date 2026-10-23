import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://retrysafe-frontend.vercel.app";
const DESCRIPTION =
  "Static analysis for webhook handlers and queue workers that run more than once: find the double charges, double emails, and dropped events before a retry does.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "retrysafe", template: "%s · retrysafe" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "retrysafe",
    title: "retrysafe: ship webhooks that are safe to run twice",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "retrysafe: ship webhooks that are safe to run twice",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
