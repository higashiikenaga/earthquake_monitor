const fs = require("fs");

const SOURCE_URL = "https://www.data.jma.go.jp/eqev/data/kyoshin/jma-shindo.html";
const OUTPUT = "station-locations.json";

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch JMA station list: HTTP ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => extractCells(match[1]))
    .filter((cells) => cells.length >= 9);

  const stations = {};
  let count = 0;
  for (const cells of rows) {
    const [region, name, address, latDeg, latMin, lonDeg, lonMin, start, end] = cells;
    if (!isNumber(latDeg) || !isNumber(latMin) || !isNumber(lonDeg) || !isNumber(lonMin)) continue;
    if (String(end || "").trim()) continue;

    const pref = extractPrefecture(address) || extractPrefecture(region);
    const station = {
      lat: Number(latDeg) + Number(latMin) / 60,
      lon: Number(lonDeg) + Number(lonMin) / 60,
      region,
      name,
      address,
      start
    };
    addStation(stations, name, station);
    if (pref) addStation(stations, `${pref}|${name}`, station);
    count += 1;
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(stations, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT}: ${count} active stations, ${Object.keys(stations).length} lookup keys`);
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((match) => decodeHtml(stripTags(match[1]).replace(/\s+/g, " ").trim()));
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function isNumber(value) {
  return value !== "" && Number.isFinite(Number(value));
}

function addStation(stations, key, station) {
  const normalized = normalizeName(key);
  if (!normalized) return;
  stations[normalized] = station;
}

function normalizeName(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .trim();
}

function extractPrefecture(value) {
  return String(value || "").match(/(北海道|東京都|大阪府|京都府|.{2,3}県)/)?.[1] || "";
}
