import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kotomachi",
    short_name: "Kotomachi",
    description: "Low-pressure Japanese speaking practice",
    start_url: "/",
    display: "standalone",
    background_color: "#F3EDE0",
    theme_color: "#1E2A16",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/avatars/misaki_avatar.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
