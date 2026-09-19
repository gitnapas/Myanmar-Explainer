import type { Metadata } from "next";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Editorial serif for the narrative voice.
const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

// Grotesque for interface chrome, legends and controls.
const grotesk = Inter({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Mono for dates, coordinates and map labels -- it reads as cartographic
// annotation rather than as body copy, which keeps the two registers apart.
const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Myanmar: A State Unfinished",
  description:
    "An interactive history of how Myanmar went from a colonial state to today's fragmented political and military landscape.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${grotesk.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
