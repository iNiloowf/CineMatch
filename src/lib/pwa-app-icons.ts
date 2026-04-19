import type { Metadata, MetadataRoute } from "next";

/**
 * Optional: set `NEXT_PUBLIC_APP_ICON_URL` to a **stable** HTTPS URL of your master app icon
 * (square PNG, ideally ≥512×512). Manifest + `<link rel="icon">` then all point at that file,
 * so replacing the asset at the same URL updates Add-to-Home / PWA installs after cache refresh.
 *
 * If unset, icons are served from `/icons/*` (synced from the Android launcher art in `public/icons/`).
 */
const remoteIconUrl = process.env.NEXT_PUBLIC_APP_ICON_URL?.trim();

export function manifestIcons(): MetadataRoute.Manifest["icons"] {
  if (remoteIconUrl) {
    return [
      { src: remoteIconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: remoteIconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
    ];
  }
  return [
    { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/app-432.png", sizes: "432x432", type: "image/png", purpose: "any" },
  ];
}

export function htmlMetadataIcons(): Metadata["icons"] {
  if (remoteIconUrl) {
    return {
      icon: [{ url: remoteIconUrl, sizes: "512x512", type: "image/png" }],
      apple: [{ url: remoteIconUrl }],
    };
  }
  return {
    icon: [
      { url: "/icons/app-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-432.png", sizes: "432x432", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  };
}
