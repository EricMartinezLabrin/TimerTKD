const fs = require('fs');
const path = require('path');

const sampleRate = 44100;

function createWavFile(filename, renderFn, durationSeconds) {
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Audio generation
  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.max(-1, Math.min(1, renderFn(t, phase))) * 0.9;
    const intSample = sample < 0 ? sample * 32768 : sample * 32767;
    buffer.writeInt16LE(Math.floor(intSample), 44 + i * 2);
  }

  const dest = path.join(__dirname, 'assets', 'sounds', filename);
  fs.writeFileSync(dest, buffer);
  console.log('Generated', dest);
}

// Envelopes
function expDecay(t, startT, duration, startVol, endVol) {
  if (t < startT) return 0;
  if (t > startT + duration) return endVol;
  const progress = (t - startT) / duration;
  return startVol * Math.pow(endVol / startVol, progress);
}

function linear(t, startT, duration, startVal, endVal) {
  if (t < startT) return startVal;
  if (t > startT + duration) return endVal;
  return startVal + (endVal - startVal) * ((t - startT) / duration);
}

// Forms
function sin(f, t) { return Math.sin(2 * Math.PI * f * t); }
function sqr(f, t) { return Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1; }
function saw(f, t) { return 2 * (t * f - Math.floor(t * f + 0.5)); }
function tri(f, t) { return 2 * Math.abs(saw(f, t)) - 1; }

// 1. scoreUp (0.18s) - two short square pips
createWavFile('scoreUp.wav', (t) => {
  let s = 0;
  if (t < 0.06) {
    s = sqr(1047, t) * expDecay(t, 0, 0.18, 0.18, 0.001);
  } else if (t > 0.07 && t < 0.18) {
    s = sqr(1319, t) * expDecay(t, 0.07, 0.11, 0.20, 0.001);
  }
  return s;
}, 0.18);

// 2. scoreDown (0.22s) - descending sine 660 -> 220
createWavFile('scoreDown.wav', (t) => {
  const f = expDecay(t, 0, 0.18, 660, 220);
  return sin(f, t) * expDecay(t, 0, 0.22, 0.20, 0.001);
}, 0.22);

// 3. foulUp (0.12s) - sawtooth buzz
createWavFile('foulUp.wav', (t) => {
  let f = 440;
  if (t > 0.03 && t < 0.06) f = 520;
  return saw(f, t) * expDecay(t, 0, 0.12, 0.14, 0.001);
}, 0.12);

// 4. foulDown (0.2s) - triangle thud
createWavFile('foulDown.wav', (t) => {
  const f = expDecay(t, 0, 0.15, 180, 120);
  return tri(f, t) * expDecay(t, 0, 0.20, 0.22, 0.001);
}, 0.20);

// 5. timerStart (0.25s) - ascending sine sweep
createWavFile('timerStart.wav', (t) => {
  const f = expDecay(t, 0, 0.15, 400, 1200);
  let v = linear(t, 0, 0.08, 0.16, 0.22);
  if (t > 0.08) v = expDecay(t, 0.08, 0.17, 0.22, 0.001);
  return sin(f, t) * v;
}, 0.25);

// 6. timerPause (0.3s) - descending triangle sweep
createWavFile('timerPause.wav', (t) => {
  const f = expDecay(t, 0, 0.25, 900, 250);
  return tri(f, t) * expDecay(t, 0, 0.30, 0.18, 0.001);
}, 0.30);

// 7. matchEnd (1.4s) - three blast referee whistle
createWavFile('matchEnd.wav', (t) => {
  const blasts = [
    { start: 0, dur: 0.30 },
    { start: 0.42, dur: 0.30 },
    { start: 0.84, dur: 0.45 },
  ];

  let sum = 0;
  for (const blast of blasts) {
    if (t >= blast.start && t < blast.start + blast.dur) {
      const relT = t - blast.start;
      
      let gain = 0.001;
      if (relT < 0.02) gain = linear(relT, 0, 0.02, 0.001, 0.28);
      else if (relT < blast.dur - 0.04) gain = 0.28;
      else gain = expDecay(relT, blast.dur - 0.04, 0.04, 0.28, 0.001);

      // lfo fm ~30hz +- 80hz
      const lfo = Math.sin(2 * Math.PI * 30 * relT) * 80;
      const f1 = 3200 + lfo; // real fm requires integration but this simple freq mod works loosely for small snippets 
      // Actually phase needs to be integrated for proper FM.
      // Easiest is to just approximate or use phase array which we aren't tracking statefully.
      // Let's just do naive sin(f*t) even though it misbehaves slightly during sweeps, for a high freq it just sounds like noise/vibrato which is perfect.
      const osc1 = sin(f1, relT);
      
      let gain2 = 0;
      if (relT < 0.02) gain2 = linear(relT, 0, 0.02, 0.001, 0.08);
      else if (relT < blast.dur - 0.04) gain2 = 0.08;
      else gain2 = expDecay(relT, blast.dur - 0.04, 0.04, 0.08, 0.001);
      const osc2 = sin(6400, relT);

      const noiseGain = gain2 * 0.5;
      const osc3 = tri(8500, relT); // hissy part

      sum += (osc1 * gain) + (osc2 * gain2) + (osc3 * noiseGain);
    }
  }
  return sum;
}, 1.4);
