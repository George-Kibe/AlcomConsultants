import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = `data:image/png;base64,${(
  await readFile(join(process.cwd(), "public/brand/alcom-logo-light.png"))
).toString("base64")}`;

/** The default share image (WhatsApp, Facebook, LinkedIn, X) for pages without their own. */
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background:
          "linear-gradient(135deg, #27225C 0%, #1a1640 60%, #12102e 100%)",
        color: "white",
      }}
    >
      <img
        src={logo}
        alt=""
        height={96}
        style={{ objectFit: "contain", alignSelf: "flex-start" }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 1000,
          }}
        >
          Property for sale and rent across Kenya
        </div>
        <div style={{ fontSize: 26, color: "#c9c7dd" }}>
          Valuations · Property management · Estate agency · Asset management ·
          Land surveys
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 26,
          color: "#e9e8f2",
        }}
      >
        <span>{siteConfig.tagline}</span>
        <span style={{ color: "#3EB354", fontWeight: 700 }}>
          alcomconsultants.co.ke
        </span>
      </div>
    </div>,
    size,
  );
}
