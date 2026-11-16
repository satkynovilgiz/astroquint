/**
 * Builds src/features/geo/world-map.json from Natural Earth 1:110m country
 * boundaries (public domain, redistributed by the `world-atlas` package).
 * Paths are projected once here so the game ships plain SVG path strings and
 * needs no mapping library at runtime.
 *
 *   node scripts/build-world-map.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const topo = JSON.parse(await readFile(require.resolve("world-atlas/countries-110m.json"), "utf8"));
const all = feature(topo, topo.objects.countries).features.filter((f) => f.id !== "010"); // drop Antarctica

const WIDTH = 1000;
const HEIGHT = 470;
const projection = geoEqualEarth().fitExtent([[6, 6], [WIDTH - 6, HEIGHT - 6]], { type: "FeatureCollection", features: all });
const path = geoPath(projection).digits(1);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const countries = all
  .map((f) => {
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const [cx, cy] = path.centroid(f);
    return {
      id: f.id ?? `x-${slug(f.properties.name)}`,
      name: f.properties.name,
      d: path(f),
      c: [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10],
      b: [x0, y0, x1, y1].map((v) => Math.round(v * 10) / 10),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const out = {
  source: "Natural Earth 1:110m Admin 0 Countries (public domain) via world-atlas@2",
  projection: "Equal Earth",
  width: WIDTH,
  height: HEIGHT,
  countries,
};
await writeFile(new URL("../src/features/geo/world-map.json", import.meta.url), JSON.stringify(out));
console.log(`Wrote ${countries.length} countries`);
