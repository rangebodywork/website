import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BookingProvider } from "@/lib/booking-context";
import { PRACTITIONER } from "@/lib/nav";
import { manrope, materialSymbols, newsreader } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Soma Studio — Personalized Somatic Sessions",
    template: "%s · Soma Studio",
  },
  description:
    `Curate a personalized somatic session with ${PRACTITIONER.name}: bodywork, private yoga, habit coaching, breathwork and resistance training in one restorative continuum.`,
};

export const viewport: Viewport = {
  themeColor: "#fef8f3",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable} ${materialSymbols.variable}`}>
      <body className="min-h-dvh">
        <BookingProvider>
          {children}
        </BookingProvider>
      </body>
    </html>
  );
}
