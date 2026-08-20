import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NoKeyBanner } from "@/components/no-key-banner";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prompt Forge",
  description:
    "Generate and compare LLM prompts. Runs entirely in your browser with your own OpenRouter key.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Dark-first: there is no theme toggle, the app is a dark developer tool.
      className={`dark ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <NoKeyBanner />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
