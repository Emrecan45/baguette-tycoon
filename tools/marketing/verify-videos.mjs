import { spawnSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

for (const [format, width, height] of [['landscape', 1920, 1080], ['portrait', 1080, 1620]]) {
  const file = `marketing/videos/video-${format}-${width}x${height}.mp4`;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr);
  const metadata = JSON.parse(probe.stdout), stream = metadata.streams[0];
  assert.equal(metadata.streams.length, 1);
  assert.equal(stream.codec_name, 'h264');
  assert.equal(stream.pix_fmt, 'yuv420p');
  assert.equal(stream.width, width); assert.equal(stream.height, height);
  assert.equal(stream.avg_frame_rate, '60/1');
  assert.equal(Number(stream.nb_frames), 1020);
  assert.equal(Number(metadata.format.duration), 17);
  assert.ok((await stat(file)).size < 50_000_000);
  const scan = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'blackdetect=d=0.016:pix_th=0.01:pic_th=0.995', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(scan.status, 0, scan.stderr);
  assert.ok(!scan.stderr.includes('black_start'), `Black frame in ${file}`);
  console.log(`${file}: 17 seconds, 60 fps, H.264, no audio or black frames`);
}
for (const [format, width, height] of [['landscape', 1920, 1080], ['portrait', 800, 1200], ['square', 800, 800]]) {
  const file = `marketing/covers/cover-${format}-${width}x${height}.png`;
  const metadata = await sharp(file).metadata();
  assert.equal(metadata.width, width); assert.equal(metadata.height, height);
}
console.log('All three cover dimensions verified.');
