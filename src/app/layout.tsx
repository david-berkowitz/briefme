import "./globals.css";
import { Fraunces, Manrope } from "next/font/google";
import type { Metadata } from "next";
import AuthHashHandler from "./AuthHashHandler";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://briefme-info.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BriefMe | Daily intelligence for modern comms",
    template: "%s | BriefMe"
  },
  description:
    "Track key voices across LinkedIn and Bluesky. Get daily alerts with client-ready takeaways.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "BriefMe | Daily intelligence for modern comms",
    description:
      "Track key voices across LinkedIn and Bluesky. Get daily alerts with client-ready takeaways.",
    url: siteUrl,
    siteName: "BriefMe",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "BriefMe | Daily intelligence for modern comms",
    description:
      "Track key voices across LinkedIn and Bluesky. Get daily alerts with client-ready takeaways."
  },
  icons: {
    icon: [{ url: "/briefme-icon-transparent.png", type: "image/png" }],
    shortcut: ["/briefme-icon-transparent.png"],
    apple: [{ url: "/briefme-icon-transparent.png" }]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
