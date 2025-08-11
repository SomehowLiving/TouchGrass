import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Providers from "./providers";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TouchGrass – Plan, Clique, Mint Memories",
  description:
    "TouchGrass is a social planning app that lets users form cliques, post exclusive or public plans, and co-mint shared experiences as NFTs. Seamlessly onboard with Google Sign-In and Sequence embedded wallet. Store moments securely via IPFS and share memories that matter.",
  keywords: [
    "TouchGrass",
    "clique planning",
    "web3 social app",
    "mint NFT memories",
    "IPFS media upload",
    "Next.js social dApp",
    "Sequence wallet",
    "decentralized media",
    "google login web3",
    "public or private NFT",
  ],
  metadataBase: new URL("https://touch-grass-revamp.vercel.app"),
  openGraph: {
    title: "TouchGrass – Plan, Clique, Mint Memories",
    description:
      "Form cliques, plan meetups, upload memories, and co-mint them as NFTs. Powered by Sequence and IPFS.",
    url: "https://touch-grass-revamp.vercel.app/",
    siteName: "TouchGrass",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TouchGrass – NFT Memories App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TouchGrass – Plan, Clique, Mint Memories",
    description:
      "Social planning meets web3. Create a clique, post a plan, and mint memories together.",
    images: ["/og-image.png"],
  },
};

<meta name="apple-mobile-web-app-title" content="TouchGrass" />;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preload" as="image" href="/bg-image2.jpg" />

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <Providers>
          <Toaster position="top-center" />
          <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-[url('/bg-image2.jpg')]">
            {children}
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
