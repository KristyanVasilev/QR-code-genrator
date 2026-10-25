"use client";

import { matrixToPath, type QrDesign, type QrMatrix } from "@/lib/qr/render";

/** SVG визуализация като React елемент — без innerHTML. */
export function QrPreview({ matrix, design, label }: { matrix: QrMatrix; design: QrDesign; label: string }) {
  return (
    <svg
      className="qr-svg"
      viewBox={`0 0 ${matrix.size} ${matrix.size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      {!design.transparent && <rect width={matrix.size} height={matrix.size} fill={design.bg} />}
      <path fill={design.fg} d={matrixToPath(matrix)} />
    </svg>
  );
}
