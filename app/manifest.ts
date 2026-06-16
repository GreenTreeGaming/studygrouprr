import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "StudyGrouprr",
        short_name: "StudyGrouprr",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
            {
                src: "/iphonelogo.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/iphonelogo.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}