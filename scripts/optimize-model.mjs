/**
 * Download Poly Haven glTF 1k → Draco + WebP GLB → public/models/
 * Also copy three.js Draco decoders to public/decoders/draco/
 */
import { mkdir, cp, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import draco3d from 'draco3dgltf';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  draco,
  textureCompress,
} from '@gltf-transform/functions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TMP = join(ROOT, '.tmp', 'models');
const OUT_DIR = join(ROOT, 'public', 'models');
const DECODER_SRC = join(
  ROOT,
  'node_modules',
  'three',
  'examples',
  'jsm',
  'libs',
  'draco',
  'gltf',
);
const DECODER_DST = join(ROOT, 'public', 'decoders', 'draco');
const HARD_CAP_BYTES = 1.2 * 1024 * 1024;
const IDEAL_BYTES = 800 * 1024;

const MODELS = [
  { asset: 'ArmChair_01', out: 'armchair.glb' },
  { asset: 'Sofa_01', out: 'sofa.glb' },
];

async function download(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function fetchPolyHavenGltf1k(assetId, destDir) {
  const api = await fetch(`https://api.polyhaven.com/files/${assetId}`);
  if (!api.ok) throw new Error(`API ${assetId}: ${api.status}`);
  const files = await api.json();
  const pack = files?.gltf?.['1k']?.gltf;
  if (!pack?.url) throw new Error(`No glTF 1k for ${assetId}`);

  await mkdir(destDir, { recursive: true });
  const gltfName = basename(new URL(pack.url).pathname);
  const gltfPath = join(destDir, gltfName);
  console.log(`  download ${assetId} → ${gltfName}`);
  await download(pack.url, gltfPath);

  for (const [rel, meta] of Object.entries(pack.include || {})) {
    await download(meta.url, join(destDir, rel));
  }
  return gltfPath;
}

async function createIO() {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });
  return io;
}

async function optimizeOnce(io, inputPath, outputPath, { maxSize, webpQuality }) {
  const document = await io.read(inputPath);
  await document.transform(
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [maxSize, maxSize],
      quality: webpQuality,
    }),
    draco({ method: 'edgebreaker' }),
  );
  await io.write(outputPath, document);
  const { size } = await stat(outputPath);
  return size;
}

async function optimizeWithBudget(io, inputPath, outputPath) {
  const attempts = [
    { maxSize: 1024, webpQuality: 80 },
    { maxSize: 1024, webpQuality: 70 },
    { maxSize: 768, webpQuality: 70 },
    { maxSize: 512, webpQuality: 65 },
  ];
  let lastSize = Infinity;
  for (const opts of attempts) {
    lastSize = await optimizeOnce(io, inputPath, outputPath, opts);
    const kb = (lastSize / 1024).toFixed(1);
    console.log(
      `  try max=${opts.maxSize} q=${opts.webpQuality} → ${kb} KB`,
    );
    if (lastSize <= HARD_CAP_BYTES) break;
  }
  if (lastSize > HARD_CAP_BYTES) {
    throw new Error(
      `${basename(outputPath)} still ${(lastSize / 1024).toFixed(1)} KB > hard cap 1.2 MB`,
    );
  }
  return lastSize;
}

async function copyDecoders() {
  await mkdir(DECODER_DST, { recursive: true });
  for (const name of [
    'draco_decoder.js',
    'draco_decoder.wasm',
    'draco_wasm_wrapper.js',
  ]) {
    await cp(join(DECODER_SRC, name), join(DECODER_DST, name));
  }
  console.log(`Copied Draco glTF decoders → public/decoders/draco/`);
}

async function main() {
  await rm(TMP, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await copyDecoders();

  const io = await createIO();
  const report = [];

  for (const { asset, out } of MODELS) {
    console.log(`\n=== ${asset} → ${out} ===`);
    const destDir = join(TMP, asset);
    const gltfPath = await fetchPolyHavenGltf1k(asset, destDir);
    const outPath = join(OUT_DIR, out);
    const size = await optimizeWithBudget(io, gltfPath, outPath);
    report.push({ out, size });
  }

  console.log('\n=== GLB sizes ===');
  for (const { out, size } of report) {
    const kb = (size / 1024).toFixed(1);
    const flag =
      size <= IDEAL_BYTES ? 'OK ideal' : size <= HARD_CAP_BYTES ? 'OK hard-cap' : 'OVER';
    console.log(`  ${out}: ${kb} KB (${flag})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
