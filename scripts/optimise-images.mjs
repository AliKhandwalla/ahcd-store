#!/usr/bin/env node
/**
 * Converts the large product and food photographs to WebP.
 *
 * WHY NOT JUST RE-COMPRESS THE PNGs
 * They are already efficiently compressed. A genuinely lossless PNG re-encode
 * comes out LARGER than the originals (1.93 MB -> 2.66 MB for the jar), so
 * there is no free win. PNG palette quantisation does shrink them, but it is
 * lossy, and measurably worse than WebP at a third of the size.
 *
 * Measured against the originals, per pixel channel:
 *
 *   ahcd-jar.png   palette PNG  0.62 MB   mean error 1.24   1.84% of channels off by >8
 *                  WebP q90     0.20 MB   mean error 1.23   1.49% of channels off by >8
 *
 * WebP wins on both size and fidelity, so that is what this uses. Dimensions,
 * aspect ratios and transparency are preserved exactly; only the container
 * changes.
 *
 * The script refuses to write anything whose mean error exceeds MAX_MEAN_ERROR,
 * so a bad conversion fails loudly instead of quietly degrading the family's
 * own photographs.
 *
 *   npm run images:optimise          convert
 *   npm run images:optimise -- --dry report what would change
 */
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);

const DIR = "public/images";
/** Below this, conversion is not worth changing a filename over. */
const MIN_BYTES = 600 * 1024;
/** Mean absolute error per channel, out of 255. Around 1 is imperceptible. */
const MAX_MEAN_ERROR = 2.5;
const QUALITY = 90;

const dry = process.argv.includes("--dry");
const mb = (b) => (b / 1048576).toFixed(2).padStart(5);

async function channels(input) {
  return sharp(input).ensureAlpha().raw().toBuffer();
}

/** Mean absolute difference per channel between two encodings of one image. */
function meanError(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

const files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith(".png"));
let before = 0;
let after = 0;
let converted = 0;

for (const name of files) {
  const file = path.join(DIR, name);
  const size = (await stat(file)).size;
  before += size;

  if (size < MIN_BYTES) {
    after += size;
    console.log(`  keep    ${mb(size)} MB  ${name}  (small enough)`);
    continue;
  }

  const original = await readFile(file);
  const webp = await sharp(original).webp({ quality: QUALITY, effort: 6 }).toBuffer();
  const error = meanError(await channels(original), await channels(webp));

  if (error > MAX_MEAN_ERROR) {
    after += size;
    console.log(
      `  REFUSED ${mb(size)} MB  ${name}  (mean error ${error.toFixed(2)} exceeds ${MAX_MEAN_ERROR})`,
    );
    continue;
  }

  after += webp.length;
  converted += 1;
  const saved = (100 * (1 - webp.length / size)).toFixed(0);
  const target = name.replace(/\.png$/i, ".webp");
  console.log(
    `  ${dry ? "would" : "wrote"}   ${mb(size)} -> ${mb(webp.length)} MB  -${saved}%  err ${error.toFixed(2)}  ${target}`,
  );

  if (!dry) {
    await writeFile(path.join(DIR, target), webp);
    await unlink(file);
  }
}

console.log(
  `\n  ${converted} converted  ${mb(before)} -> ${mb(after)} MB` +
    `  (-${(100 * (1 - after / before)).toFixed(0)}%)${dry ? "  [dry run]" : ""}`,
);
if (converted > 0 && !dry) {
  console.log(
    "\n  Filenames changed. Update code references, supabase/schema.sql and the\n" +
      "  product_images rows in the live database (see README).\n",
  );
}
