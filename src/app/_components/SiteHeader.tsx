"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export const SiteHeader = () => {
  return (
    <header className="relative mb-8">
      {/* Banner Image */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden rounded-lg">
        <Image
          src="/twitter_banner_trial.png.webp"
          alt="Pixel Cab Games Banner"
          fill
          className="object-cover pixelated"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/80 to-theme-primary/40" />

      </div>

      <style jsx>{`
        .pixelated {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        .arcade-font {
          font-family: 'Courier New', monospace;
          letter-spacing: 0.1em;
          text-shadow: 2px 2px 0px rgba(255, 110, 199, 0.3);
        }
      `}</style>
    </header>
  );
};
