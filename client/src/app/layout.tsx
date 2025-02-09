import "./globals.css";
import { ReactNode } from "react";
import Navbar from "@/components/navbar";
import Script from "next/script";

import { Kaisei_HarunoUmi } from 'next/font/google';

const kaisei = Kaisei_HarunoUmi({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

import { Inter } from "next/font/google";

// Import the font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"], // Customize weights as needed
  variable: "--font-inter",
});

export const metadata = {
  title: "Stockr",
  description: "",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Additional head elements if needed */}
      </head>
      <body className={`${kaisei.className} ${inter.variable} overflow-y-hidden`}>
        <Navbar />
        <div className="container">{children}</div>

        <Script
          src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
