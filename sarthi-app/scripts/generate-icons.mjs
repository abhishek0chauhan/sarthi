import sharp from 'sharp';
import { writeFileSync } from 'fs';

// SarthiGo compass rose icon SVG
// Orange background + 4-point compass mark (white solid N/W, semi-transparent S/E)

function buildIconSvg(size, withPadding = true) {
  const pad = withPadding ? size * 0.15 : 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - pad;

  // Compass points relative to center
  const N  = { x: cx,        y: cy - r      };   // north tip
  const S  = { x: cx,        y: cy + r      };   // south tip
  const E  = { x: cx + r,    y: cy          };   // east tip
  const W  = { x: cx - r,    y: cy          };   // west tip

  // Base width of each pointer (fraction of r)
  const bw = r * 0.32;

  // N/S base endpoints (horizontal)
  const NL = { x: cx - bw, y: cy };
  const NR = { x: cx + bw, y: cy };
  // E/W base endpoints (vertical)
  const ET = { x: cx, y: cy - bw };
  const EB = { x: cx, y: cy + bw };

  // Center pivot radius
  const pr = r * 0.07;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#E8601C"/>

  <!-- North pointer — solid white -->
  <polygon points="${N.x},${N.y} ${NR.x},${NR.y} ${NL.x},${NL.y}" fill="white"/>

  <!-- South pointer — semi-transparent -->
  <polygon points="${S.x},${S.y} ${NR.x},${NR.y} ${NL.x},${NL.y}" fill="rgba(255,255,255,0.35)"/>

  <!-- West pointer — solid white -->
  <polygon points="${W.x},${W.y} ${ET.x},${ET.y} ${EB.x},${EB.y}" fill="white"/>

  <!-- East pointer — semi-transparent -->
  <polygon points="${E.x},${E.y} ${ET.x},${ET.y} ${EB.x},${EB.y}" fill="rgba(255,255,255,0.35)"/>

  <!-- Center pivot -->
  <circle cx="${cx}" cy="${cy}" r="${pr}" fill="#E8601C"/>
</svg>`.trim();
}

async function generateIcon(svgString, outputPath, size) {
  const svgBuffer = Buffer.from(svgString);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`✓ Generated ${outputPath} (${size}x${size})`);
}

// Generate all required icon sizes
await generateIcon(buildIconSvg(1024), 'assets/icon.png', 1024);
await generateIcon(buildIconSvg(1024), 'assets/adaptive-icon.png', 1024);
await generateIcon(buildIconSvg(512, false), 'assets/splash-icon.png', 512);

console.log('\n✅ All icons generated successfully!');
