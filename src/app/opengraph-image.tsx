/**
 * The link preview (Open Graph / Twitter card), rendered once at build time. It is
 * what people see when the link is shared: the mark, the name and one line.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Gryphon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await readFile(join(process.cwd(), "public/gryphon.svg"));
  const src = `data:image/svg+xml;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 64,
        background: "#02030a",
        color: "#e8ecf4",
      }}
    >
      <img src={src} width={260} height={260} alt="" />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: 24 }}>GRYPHON</div>
        <div style={{ display: "flex", fontSize: 36, color: "#a9b2c7", maxWidth: 620 }}>
          Thermal satellite imagery on a map, declared as JSON.
        </div>
        <div style={{ display: "flex", width: 120, height: 6, background: "#ff6a1a" }} />
      </div>
    </div>,
    size,
  );
}
