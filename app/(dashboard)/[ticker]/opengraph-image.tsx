import { ImageResponse } from "next/og";

export const alt = "TickerIO dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#05070d",
          padding: "72px",
          color: "#e7ecf5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #4f8cff, #7c5cff)",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700 }}>TickerIO</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: "-4px" }}>{symbol}</div>
          <div style={{ fontSize: 34, color: "#8a97b0" }}>
            Live price · anchored timeframes · AI sentiment · trend bias
          </div>
        </div>

        <div style={{ fontSize: 26, color: "#586079" }}>
          Yahoo Finance · Alternative.me · Forex Factory · TradingView
        </div>
      </div>
    ),
    { ...size },
  );
}
