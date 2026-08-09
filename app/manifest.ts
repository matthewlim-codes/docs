import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f8fafc",
    display: "standalone",
    name: "Noted",
    short_name: "Noted",
    start_url: "/app",
    theme_color: "#2563eb"
  };
}
