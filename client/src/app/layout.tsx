import "./globals.css";
import { ReactNode } from "react";
import Navbar from "@/components/navbar";
import Script from "next/script";
import '@fortawesome/fontawesome-free/css/all.min.css';

//import { Kaisei_HarunoUmi } from 'next/font/google';
import localFont from "next/font/local";

// const kaisei = Kaisei_HarunoUmi({
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
// });

// const inter = localFont({
//   src: [
//     {
//       path: "/fonts/Inter/static/Inter_18pt-Regular.ttf",
//       weight: "400",
//       style: "normal",
//     },
//   ],
//   display: "swap",
//});


// const inter = localFont({
//   src: [
//     {
//       path: "/fonts/Inter/static/Inter_18pt-Regular.ttf",
//       weight: "400",
//       style: "normal",
//     },
//     // {
//     //   path: "/fonts/Inter/static/Inter_18pt-Bold.ttf",
//     //   weight: "500",
//     //   style: "normal",
//     // },
//     // {
//     //   path: "/fonts/Inter/static/Inter_18pt-ExtraBold.ttf",
//     //   weight: "700",
//     //   style: "normal",
//     // },
//   ],
//   display: "swap",
//   //variable: `--font-inter`,
// });


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
      <body className={`overflow-y-hidden`}>
      {/* <body className={`${inter.className} ${inter.variable} overflow-y-hidden`}> */}
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
