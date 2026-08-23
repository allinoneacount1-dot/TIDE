import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TIDE — Capital, on tide.",
  description: "Recurring execution protocol for tokenized stocks on Robinhood L2. Non-custodial, verifiable on-chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0B0A] text-[#F2F2F0] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
