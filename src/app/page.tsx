import Image from "next/image";
import { UnifiedWallet } from "./_components/unifiedWallet";
import { SiteHeader } from "./_components/SiteHeader";
import { SiteFooter } from "./_components/SiteFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-theme-primary p-6">
      <div className="max-w-4xl mx-auto">
        <SiteHeader />

        <section className="rounded-lg bg-theme-card shadow-lg border border-theme-primary">
          <h2 className="text-xl font-semibold p-4 border-b border-gray-200 text-theme-primary flex items-center justify-center gap-2">
            <span className="w-10 h-10 relative">
              <Image
                src="/Face_Logo_2_Pink_border.png"
                alt="Pixel Cab Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </span>
            Connect Your Wallet
            <span className="w-10 h-10 relative">
              <Image
                src="/Face_Logo_2_Pink_border.png"
                alt="Pixel Cab Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </span>
          </h2>
          <UnifiedWallet />
        </section>

        {/* Footer with logo row */}
        <SiteFooter />
      </div>
    </main>
  );
}
