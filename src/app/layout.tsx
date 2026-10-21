import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "retrysafe", template: "%s · retrysafe" },
  description:
    "Static analysis for webhook handlers and queue workers that run more than once: find the double charges, double emails, and dropped events before a retry does.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script adds `js` before paint, so reveal animations start hidden only when they can run.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
