import { createDummyMatrix, matrixToPath } from "@/lib/qr/render";
import { Download, Wifi } from "@/components/icons";
import { getI18n } from "@/i18n/server";

// Декоративен (неразчитаем) код — изчислява се при билд, без JavaScript в браузъра
const demo = createDummyMatrix("https://qrly.example/menu/restaurant", { ecc: "M", margin: 1 });

export function MiniQr({ seed, color = "#0b0b0c" }: { seed: string; color?: string }) {
  const m = createDummyMatrix(seed, { ecc: "L", margin: 1 });
  return (
    <svg viewBox={`0 0 ${m.size} ${m.size}`} shapeRendering="crispEdges" aria-hidden>
      <rect width={m.size} height={m.size} fill="#fff" />
      <path fill={color} d={matrixToPath(m)} />
    </svg>
  );
}

/** „Телефон“ с QR код и плаващи карти — по примера на героя в Atoks. */
export async function HeroVisual() {
  const { t } = await getI18n();
  const v = t.home.visual;
  return (
    <div className="hero-visual rise d3" aria-hidden>
      <div className="device">
        <div className="device-screen">
          <div className="device-title">{v.menu}</div>
          <div className="device-qr">
            <svg viewBox={`0 0 ${demo.size} ${demo.size}`} shapeRendering="crispEdges">
              <path fill="#0b0b0c" d={matrixToPath(demo)} />
            </svg>
          </div>
          <div className="device-row">
            <span>PNG</span>
            <span>SVG</span>
            <span className="dark">JPG</span>
          </div>
        </div>
      </div>

      <div className="float-card left">
        <span className="float-icon" style={{ background: "linear-gradient(135deg,#663cf6,#ff8da4)" }}>
          <Wifi />
        </span>
        <span>
          <strong>{v.wifi}</strong>
          <span className="muted">{v.wifiSub}</span>
        </span>
        <span className="price">WPA2</span>
      </div>

      <div className="float-card right">
        <span className="float-icon" style={{ background: "#0b0b0c" }}>
          <Download />
        </span>
        <span>
          <strong>{v.print}</strong>
          <span className="muted">2048 × 2048 px</span>
        </span>
        <span className="price">SVG</span>
      </div>
    </div>
  );
}
