import type { MetadataRoute } from "next";
import { manifestIcons } from "@/lib/pwa-app-icons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CineMatch",
    short_name: "CineMatch",
    description: "A polished mobile-first movie matching app.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0b1a",
    theme_color: "#5b21b6",
    icons: manifestIcons(),
  };
}
