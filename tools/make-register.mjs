import { createRegisterSound } from './audio/register-sound.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

let seed = 42;
Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const sr = 44100, samples = createRegisterSound(sr);
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
samples.forEach((v, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
await mkdir('tmp', { recursive: true });
await writeFile('tmp/register.wav', wav);
const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'tmp/register.wav', '-af', 'loudnorm=I=-23:TP=-3:LRA=7', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '3', 'public/sfx/sale.mp3'], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Register encoding failed');
