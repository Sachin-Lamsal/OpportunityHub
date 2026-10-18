import type { Metadata } from "next";
import "./globals.css";

function getMetadataBase(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Ignore invalid URL and fall back
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    try {
      return new URL(`https://${vercelUrl}`);
    } catch {
      // Fall through
    }
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  title: {
    default: "OpportunityHub",
    template: "%s | OpportunityHub",
  },
  description:
    "Discover opportunities, track activities, and build your university portfolio — for secondary school students in Kathmandu.",
  metadataBase: getMetadataBase(),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
