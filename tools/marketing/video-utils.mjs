import sharp from 'sharp';

export const CONTACT_FRAMES = [0, 60, 108, 246, 354, 426, 486, 552, 636, 738, 882, 990];

export async function makeContact(files, format, destination) {
  if (files.length !== 12) throw new Error('A contact sheet needs exactly 12 frames.');
  const w = format === 'landscape' ? 384 : 216, h = format === 'landscape' ? 216 : 324, label = 28;
  const tiles = await Promise.all(files.map(async (file, i) => ({
    input: await sharp(file).resize(w, h).png().toBuffer(), left: i % 4 * w, top: Math.floor(i / 4) * (h + label),
  })));
  const annotations = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 4}" height="${(h + label) * 3}">${CONTACT_FRAMES.map((frame, i) => `<text x="${i % 4 * w + 10}" y="${Math.floor(i / 4) * (h + label) + h + 19}" font-family="Arial" font-size="16" fill="#ffffff">${(frame / 60).toFixed(2)} s</text>`).join('')}</svg>`;
  tiles.push({ input: Buffer.from(annotations), left: 0, top: 0 });
  await sharp({ create: { width: w * 4, height: (h + label) * 3, channels: 3, background: '#23233F' } }).composite(tiles).png().toFile(destination);
}
