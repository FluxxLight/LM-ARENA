import { ImageResponse } from "next/og";
import { CATEGORY_CONTENT, CATEGORY_LIST, isKnownCategory } from "@/content";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") ?? "IDEAForge").slice(0, 90);
  const subtitle = (url.searchParams.get("subtitle") ?? "Transforme escolhas em ideias.").slice(0, 140);
  const category = url.searchParams.get("category");
  const accent = category && isKnownCategory(category) ? CATEGORY_CONTENT[category].accent : ["#8b5cf6", "#2563eb"];
  const totalTools = CATEGORY_LIST.reduce((acc, item) => acc + item.tools.length, 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#07070b",
          backgroundImage: `radial-gradient(circle at 18% 0%, ${accent[0]}55, transparent 55%), radial-gradient(circle at 92% 18%, ${accent[1]}44, transparent 55%)`,
          color: "#f5f5f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            IF
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600 }}>
            IDEA<span style={{ color: "#c4b5fd" }}>Forge</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-1.5px" }}>{title}</div>
          <div style={{ marginTop: "20px", fontSize: "28px", color: "rgba(255,255,255,0.6)", lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "20px", color: "rgba(255,255,255,0.45)" }}>
          <span>Motor determinístico · sem IA</span>
          <span>9 categorias · {totalTools} ferramentas</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
