"use client";

import Link from "next/link";
import Image from "next/image";

const footerImages = [
  {
    src: "/PCG_Dude_.png",
    alt: "Pixel Cab Games Character"
  },
  {
    src: "/Face_Logo_2_Pink_border.png",
    alt: "Pixel Cab Games Logo"
  },
  {
    src: "/PCG_Dude_.png",
    alt: "Pixel Cab Games Character"
  }
];

export const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-theme-accent/20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Logo Section */}
        <div className="flex justify-center items-center gap-4 mb-6">
          {footerImages.map((image, index) => (
            <Image
              key={index}
              src={image.src}
              alt={image.alt}
              width={64}
              height={64}
              className="object-contain pixelated hover:scale-110 transition-transform"
              style={{ imageRendering: 'pixelated' }}
            />
          ))}
        </div>

        {/* Links Section */}
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="text-theme-secondary hover:text-theme-highlight transition-colors">
            Home
          </Link>
          <Link href="/mint" className="text-theme-secondary hover:text-theme-highlight transition-colors">
            Mint
          </Link>
          <a 
            href="https://twitter.com/PixelCabGames" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-theme-secondary hover:text-theme-highlight transition-colors"
          >
            Twitter
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center text-theme-secondary/60 text-sm">
          © {currentYear} Pixel Cab Games. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
