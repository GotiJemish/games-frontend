import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "./_components/navbar";
import { ThemeProvider } from "@/lib/use-theme";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Board Arcade",
  description:
    "Play classic board games online with real-time multiplayer or local pass & play.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The inline ThemeScript mutates the <html> element pre-hydration;
    // suppressHydrationWarning silences the resulting attribute-mismatch
    // warning. Matches the next-themes recommended pattern.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`(() => {
            try {
              var stored = localStorage.getItem("theme");
              var dark = stored === "dark" || (stored !== "light" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.classList.toggle("dark", dark);
            } catch (e) {}
          })();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <Navbar />
          <div className="flex-1 flex flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}

