import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FutureEd — Lead Management System",
  description:
    "FutureEd's Lead Management System — track, manage, and convert education leads efficiently across all your campaigns and channels.",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "FutureEd — Lead Management System",
    description:
      "FutureEd's Lead Management System — track, manage, and convert education leads efficiently across all your campaigns and channels.",
    type: "website",
    images: [{ url: "/logo.jpg", width: 512, height: 512, alt: "FutureEd Logo" }],
  },
  twitter: {
    card: "summary",
    title: "FutureEd — Lead Management System",
    description:
      "FutureEd's Lead Management System — track, manage, and convert education leads efficiently.",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Kick off the session refresh before any JS bundle has downloaded.
          The auth store picks up this promise instead of starting its own
          request after hydration, which takes the API round-trip out of the
          critical path to first content. Only fires when a session cookie is
          present, so logged-out visitors don't pay for a guaranteed 401.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(/(?:^|; )auth_session=/.test(document.cookie)){window.__earlyRefresh=fetch('/api/auth/refresh',{method:'POST',credentials:'same-origin'}).catch(function(){return null})}",
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
