import "./globals.css";
import { ReactNode } from "react";
import Navbar from "@/components/navbar";
import Script from "next/script";

export const metadata = {
  title: "Finance Tracker",
  description: "Your personal finance tracker",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Additional head elements if needed */}
      </head>
      <body>
        <Navbar />
        <div className="container my-4">{children}</div>
        <footer className="footer bg-light py-3 mt-auto">
          <div className="container">
            <p className="text-center mb-0">&copy; 2025 Stockr | Luis Delotavo</p>
          </div>
        </footer>

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
