"use client";

import { useId } from "react";
import type { Locale } from "@/i18n/config";

// SVG знамена (емоджи знамената не се показват на Windows).
// Испанското е опростено — без герба, за да е четимо в малък размер.
export function Flag({ locale, className = "flag" }: { locale: Locale; className?: string }) {
  const id = useId();
  const box = { viewBox: "0 0 30 20", className, "aria-hidden": true, preserveAspectRatio: "xMidYMid slice" } as const;

  switch (locale) {
    case "bg":
      return (
        <svg {...box}>
          <rect width="30" height="20" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#00966E" />
          <rect y="13.33" width="30" height="6.67" fill="#D62612" />
        </svg>
      );
    case "es":
      return (
        <svg {...box}>
          <rect width="30" height="20" fill="#AA151B" />
          <rect y="5" width="30" height="10" fill="#F1BF00" />
        </svg>
      );
    case "de":
      return (
        <svg {...box}>
          <rect width="30" height="6.67" fill="#000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </svg>
      );
    case "fr":
      return (
        <svg {...box}>
          <rect width="10" height="20" fill="#002395" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#ED2939" />
        </svg>
      );
    case "it":
      return (
        <svg {...box}>
          <rect width="10" height="20" fill="#009246" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#CE2B37" />
        </svg>
      );
    default:
      // Великобритания (Union Jack); clipPath id трябва да е уникален на страницата
      return (
        <svg {...box} viewBox="0 0 60 40">
          <clipPath id={`${id}-t`}>
            <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
          </clipPath>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
          <path d="M0,0 L60,40 M60,0 L0,40" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="5" />
          <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="12" />
          <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="7" />
        </svg>
      );
  }
}
