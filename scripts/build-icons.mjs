#!/usr/bin/env node
//
// Régénère les icônes de l'application — SVG et PNG — depuis une définition
// géométrique unique.
//
// Aucune dépendance, aucun réseau, aucune police : le « B » est dessiné en
// primitives (un fût et deux panses évidées), et non posé en `<text>`. Un
// `<text>` rendrait l'icône dépendante d'une police installée sur la machine,
// et surtout impossible à rasteriser sans moteur de rendu.
//
// Le PNG est encodé à la main (zlib est dans Node) et les formes sont
// rasterisées par leur fonction de distance signée, ce qui donne l'anticrénelage
// sans bibliothèque graphique.
//
// Usage : node scripts/build-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* -------------------------------------------------------------------------
 * Couleurs — reprises des tokens de `src/styles/tokens.css`, en oklch, puis
 * converties. Recopier des hexadécimaux ferait diverger l'icône du thème.
 * ---------------------------------------------------------------------- */

/** oklch → sRGB. `l` en 0..1, `c` en 0..0.4, `h` en degrés. */
function oklchToRgb(l, c, h) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];

  return linear.map((channel) => {
    const encoded =
      channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(encoded * 255)));
  });
}

const COLORS = {
  // --color-accent (thème clair)
  background: oklchToRgb(0.52, 0.16, 35),
  // --tile-bg
  tile: oklchToRgb(0.98, 0.014, 85),
  // --tile-text
  glyph: oklchToRgb(0.2, 0.02, 60),
};

const hex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/* -------------------------------------------------------------------------
 * Géométrie — en coordonnées unitaires (0..1), source unique du SVG et du PNG.
 * ---------------------------------------------------------------------- */

/** Un rectangle arrondi : { x, y, w, h, r }. */
const rect = (x, y, w, h, r) => ({ x, y, w, h, r });

const TILE = rect(0.156, 0.156, 0.688, 0.688, 0.14);

/** Boîte du glyphe, centrée dans la tuile. */
const GLYPH_BOX = { x: 0.355, y: 0.3, w: 0.29, h: 0.4 };

/**
 * Le « B », en coordonnées locales 0..1 de sa boîte.
 *
 * Les rayons sont rapportés à la plus petite dimension de la boîte (voir
 * `place`) : `0.36` donne à une panse haute de `0.52` un côté droit
 * pleinement arrondi, et non un rectangle à peine adouci.
 */
const GLYPH = {
  // Angles francs : c'est la forme d'un « B », et un arrondi laisserait une
  // encoche visible là où le fût rejoint le côté gauche des panses.
  stem: rect(0, 0, 0.3, 1, 0),
  bowls: [
    { outer: rect(0, 0, 0.86, 0.52, 0.36), inner: rect(0.3, 0.12, 0.3, 0.28, 0.19) },
    { outer: rect(0, 0.48, 1, 0.52, 0.36), inner: rect(0.3, 0.6, 0.4, 0.28, 0.19) },
  ],
};

/** Projette un rectangle du repère local du glyphe vers le repère de l'icône. */
function place(r, box, scale, center) {
  const mapped = rect(
    box.x + r.x * box.w,
    box.y + r.y * box.h,
    r.w * box.w,
    r.h * box.h,
    r.r * Math.min(box.w, box.h),
  );
  return scaleRect(mapped, scale, center);
}

/** Homothétie autour d'un centre — sert à rentrer dans la zone sûre maskable. */
function scaleRect(r, scale, center = 0.5) {
  return rect(
    center + (r.x - center) * scale,
    center + (r.y - center) * scale,
    r.w * scale,
    r.h * scale,
    r.r * scale,
  );
}

/**
 * Décrit l'icône : une liste de formes à peindre dans l'ordre.
 * `contentScale` réduit le contenu sans toucher au fond (variante maskable).
 */
function describe({ rounded, contentScale }) {
  const background = rounded
    ? rect(0, 0, 1, 1, 0.22)
    : rect(0, 0, 1, 1, 0);

  const box = {
    x: 0.5 + (GLYPH_BOX.x - 0.5) * contentScale,
    y: 0.5 + (GLYPH_BOX.y - 0.5) * contentScale,
    w: GLYPH_BOX.w * contentScale,
    h: GLYPH_BOX.h * contentScale,
  };

  return {
    background: { shape: background, color: COLORS.background },
    tile: { shape: scaleRect(TILE, contentScale), color: COLORS.tile },
    glyph: {
      color: COLORS.glyph,
      stem: place(GLYPH.stem, box, 1),
      bowls: GLYPH.bowls.map((bowl) => ({
        outer: place(bowl.outer, box, 1),
        inner: place(bowl.inner, box, 1),
      })),
    },
  };
}

/* -------------------------------------------------------------------------
 * Rendu SVG
 * ---------------------------------------------------------------------- */

/** Chemin d'un rectangle arrondi, en sens horaire. */
function roundedPath(r, size) {
  const x = r.x * size;
  const y = r.y * size;
  const w = r.w * size;
  const h = r.h * size;
  const radius = Math.min(r.r * size, w / 2, h / 2);
  const n = (value) => Number(value.toFixed(3));

  if (radius <= 0) {
    return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
  }

  return [
    `M${n(x + radius)} ${n(y)}`,
    `H${n(x + w - radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w)} ${n(y + radius)}`,
    `V${n(y + h - radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w - radius)} ${n(y + h)}`,
    `H${n(x + radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x)} ${n(y + h - radius)}`,
    `V${n(y + radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x + radius)} ${n(y)}`,
    'Z',
  ].join('');
}

/** Chemin inverse, pour évider une panse avec `fill-rule="evenodd"`. */
function reversedRoundedPath(r, size) {
  const x = r.x * size;
  const y = r.y * size;
  const w = r.w * size;
  const h = r.h * size;
  const radius = Math.min(r.r * size, w / 2, h / 2);
  const n = (value) => Number(value.toFixed(3));

  return [
    `M${n(x + radius)} ${n(y)}`,
    `A${n(radius)} ${n(radius)} 0 0 0 ${n(x)} ${n(y + radius)}`,
    `V${n(y + h - radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 0 ${n(x + radius)} ${n(y + h)}`,
    `H${n(x + w - radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 0 ${n(x + w)} ${n(y + h - radius)}`,
    `V${n(y + radius)}`,
    `A${n(radius)} ${n(radius)} 0 0 0 ${n(x + w - radius)} ${n(y)}`,
    'Z',
  ].join('');
}

function toSvg(options, size = 64) {
  const icon = describe(options);

  // Chaque panse est un chemin distinct : les réunir en un seul evenodd
  // percerait un trou là où le fût les recouvre.
  const bowls = icon.glyph.bowls
    .map(
      (bowl) =>
        `  <path fill-rule="evenodd" d="${roundedPath(bowl.outer, size)}${reversedRoundedPath(
          bowl.inner,
          size,
        )}" />`,
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Boggle">
  <path d="${roundedPath(icon.background.shape, size)}" fill="${hex(icon.background.color)}" />
  <path d="${roundedPath(icon.tile.shape, size)}" fill="${hex(icon.tile.color)}" />
  <g fill="${hex(icon.glyph.color)}">
  <path d="${roundedPath(icon.glyph.stem, size)}" />
${bowls}
  </g>
</svg>
`;
}

/* -------------------------------------------------------------------------
 * Rendu PNG — rasterisation par fonction de distance signée.
 * ---------------------------------------------------------------------- */

/** Distance signée à un rectangle arrondi, en pixels. Négative à l'intérieur. */
function distanceToRect(px, py, r, size) {
  const x = r.x * size;
  const y = r.y * size;
  const w = r.w * size;
  const h = r.h * size;
  const radius = Math.min(r.r * size, w / 2, h / 2);

  const cx = x + w / 2;
  const cy = y + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - radius);
  const qy = Math.abs(py - cy) - (h / 2 - radius);

  return (
    Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius
  );
}

/** Couverture d'un pixel : la distance signée fait l'anticrénelage. */
const coverage = (distance) => Math.max(0, Math.min(1, 0.5 - distance));

/** Peint une couleur sur le tampon RGBA, pondérée par la couverture. */
function paint(pixels, index, [r, g, b], alpha) {
  if (alpha <= 0) return;
  const inverse = 1 - alpha;
  pixels[index] = Math.round(r * alpha + pixels[index] * inverse);
  pixels[index + 1] = Math.round(g * alpha + pixels[index + 1] * inverse);
  pixels[index + 2] = Math.round(b * alpha + pixels[index + 2] * inverse);
  pixels[index + 3] = Math.round(255 * alpha + pixels[index + 3] * inverse);
}

function rasterize(options, size) {
  const icon = describe(options);
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      paint(pixels, index, icon.background.color, coverage(distanceToRect(px, py, icon.background.shape, size)));
      paint(pixels, index, icon.tile.color, coverage(distanceToRect(px, py, icon.tile.shape, size)));

      // Union du fût et des panses évidées : min pour l'union, max(a, -b) pour
      // la soustraction — l'algèbre habituelle des distances signées.
      let glyph = distanceToRect(px, py, icon.glyph.stem, size);
      for (const bowl of icon.glyph.bowls) {
        const carved = Math.max(
          distanceToRect(px, py, bowl.outer, size),
          -distanceToRect(px, py, bowl.inner, size),
        );
        glyph = Math.min(glyph, carved);
      }
      paint(pixels, index, icon.glyph.color, coverage(glyph));
    }
  }

  return pixels;
}

/* -------------------------------------------------------------------------
 * Encodage PNG
 * ---------------------------------------------------------------------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  header[10] = 0; // compression deflate
  header[11] = 0; // filtrage adaptatif
  header[12] = 0; // pas d'entrelacement

  // Une ligne = un octet de filtre (0 = aucun) suivi des pixels.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------
 * Sorties
 * ---------------------------------------------------------------------- */

const ROUNDED = { rounded: true, contentScale: 1 };
// Le fond couvre tout : le système applique son propre masque par-dessus.
const BLEED = { rounded: false, contentScale: 1 };
// Zone sûre maskable : le contenu doit tenir dans le disque central de 80 %,
// donc dans un carré de côté 0,8/√2 ≈ 0,57 — d'où cette réduction.
const MASKABLE = { rounded: false, contentScale: 0.72 };

const PNG_TARGETS = [
  ['icon-192.png', 192, ROUNDED],
  ['icon-512.png', 512, ROUNDED],
  ['icon-maskable-192.png', 192, MASKABLE],
  ['icon-maskable-512.png', 512, MASKABLE],
  ['apple-touch-icon.png', 180, BLEED],
];

writeFileSync(join(outDir, 'favicon.svg'), toSvg(ROUNDED));
console.log('✓ favicon.svg');

writeFileSync(join(outDir, 'icon.svg'), toSvg(ROUNDED, 512));
console.log('✓ icon.svg');

for (const [name, size, options] of PNG_TARGETS) {
  const png = encodePng(rasterize(options, size), size);
  writeFileSync(join(outDir, name), png);
  console.log(`✓ ${name} — ${size}×${size}, ${(png.length / 1024).toFixed(1)} Ko`);
}
