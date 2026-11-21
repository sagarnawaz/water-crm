import type { MetadataRoute } from "next";

// Makes the app installable ("Add to Home screen") on Android and iPhone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paani Register",
    short_name: "Paani",
    description: "Water supply register: bottles, payments and balances.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef3f6",
    theme_color: "#0a6a93",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
