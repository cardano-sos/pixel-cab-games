import type { Metadata } from "next";
import "./globals.css";
import { MeshProviderApp } from "@/providers/meshProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import "@meshsdk/react/styles.css";

export const metadata: Metadata = {
  title: "Pixel Cab Games - Cardano Collectible Minting",
  description: "Mint unique Pixel Cab Games Collectibles on the Cardano blockchain. Connect your wallet and join the collection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MeshProviderApp>
          <WalletProvider>
            {children}
          </WalletProvider>
        </MeshProviderApp>
      </body>
    </html>
  );
}
