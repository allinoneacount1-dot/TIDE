import type { Metadata } from "next";
import { Web3Providers } from "../providers";

export const metadata: Metadata = {
  title: "Terminal",
  description: "Operate your recurring execution vaults on Robinhood Chain.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}
