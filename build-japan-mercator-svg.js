const fs = require("fs");

const SOURCE_URL = "https://raw.githubusercontent.com/piuccio/open-data-jp-prefectures-geojson/master/output/prefectures.geojson";
const TILE_SIZE = 256;
const SOURCE_ZOOM = 8;
const SIMPLIFY_TOLERANCE = 1.2;
const SVG_PATH = "japan-mercator-map.svg";
const META_PATH = "japan-mercator-map.json";

function latLonToWorldPixel(lat, lon, zoom = SOURCE_ZOOM, tileSize = TILE_SIZE) {
  const clampedLat = Math.min(85.05112878, Math.max(-85.05112878, Number(lat)));
  const sinLat = Math.sin(clampedLat * Math.PI / 180);
  const scale = tileSize * 2 ** zoom;
  return {
    x: ((Number(lon) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function eachRing(geometry, callback) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates || []) callback(ring);
  }
  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates || []) {
      for (const ring of polygon || []) callback(ring);
    }
  }
}

function format(value) {
  return Number(value).toFixed(1).replace(/\.0$/, "");
}

function ringToPath(ring, bounds) {
  const points = ring.map(([lon, lat]) => latLonToWorldPixel(lat, lon));
  const simplified = simplifyClosedRing(points, SIMPLIFY_TOLERANCE);
  return simplified.map((point, index) => {
    const x = format(point.x - bounds.minX);
    const y = format(point.y - bounds.minY);
    return `${index === 0 ? "M" : "L"}${x} ${y}`;
  }).join(" ") + " Z";
}

function simplifyClosedRing(points, tolerance) {
  if (points.length <= 5) return points;
  const open = points.slice(0, -1);
  const simplified = simplifyLine(open, tolerance);
  return simplified.length >= 3 ? simplified : open;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  simplifySection(points, 0, points.length - 1, tolerance * tolerance, keep);
  return points.filter((_, index) => keep[index]);
}

function simplifySection(points, first, last, toleranceSq, keep) {
  let maxDistanceSq = 0;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const distanceSq = perpendicularDistanceSq(points[i], points[first], points[last]);
    if (distanceSq > maxDistanceSq) {
      maxDistanceSq = distanceSq;
      index = i;
    }
  }
  if (maxDistanceSq > toleranceSq && index !== -1) {
    keep[index] = true;
    simplifySection(points, first, index, toleranceSq, keep);
    simplifySection(points, index, last, toleranceSq, keep);
  }
}

function perpendicularDistanceSq(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON: HTTP ${response.status}`);
  }

  const geojson = await response.json();
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  for (const feature of geojson.features || []) {
    eachRing(feature.geometry, (ring) => {
      for (const [lon, lat] of ring) {
        const point = latLonToWorldPixel(lat, lon);
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxY = Math.max(bounds.maxY, point.y);
      }
    });
  }

  if (!Number.isFinite(bounds.minX)) {
    throw new Error("GeoJSON did not contain polygon coordinates.");
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const paths = [];

  for (const feature of geojson.features || []) {
    const rings = [];
    eachRing(feature.geometry, (ring) => {
      if (ring.length >= 3) rings.push(ringToPath(ring, bounds));
    });
    if (rings.length === 0) continue;
    const name = String(feature.properties?.P || feature.properties?.name || "");
    paths.push(`  <path data-name="${escapeXml(name)}" d="${rings.join(" ")}"/>`);
  }

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${format(width)} ${format(height)}">`,
    `  <rect width="${format(width)}" height="${format(height)}" fill="none"/>`,
    `  <g fill="#dfe8d5" stroke="#5a646c" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd">`,
    ...paths,
    `  </g>`,
    `</svg>`,
    ``
  ].join("\n");

  const meta = {
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    projection: "WebMercator",
    tileSize: TILE_SIZE,
    zoom: SOURCE_ZOOM,
    simplifyTolerance: SIMPLIFY_TOLERANCE,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    width,
    height,
    features: geojson.features?.length || 0
  };

  fs.writeFileSync(SVG_PATH, svg, "utf8");
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + "\n", "utf8");
  console.log(`wrote ${SVG_PATH} and ${META_PATH}`);
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
