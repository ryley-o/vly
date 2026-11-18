// Keccak-256 (the Ethereum hash, NOT NIST SHA3-256: different padding). Pure JS, BigInt-free.

const RC = [
  [0x00000001, 0x00000000], [0x00008082, 0x00000000], [0x0000808a, 0x80000000], [0x80008000, 0x80000000],
  [0x0000808b, 0x00000000], [0x80000001, 0x00000000], [0x80008081, 0x80000000], [0x00008009, 0x80000000],
  [0x0000008a, 0x00000000], [0x00000088, 0x00000000], [0x80008009, 0x00000000], [0x8000000a, 0x00000000],
  [0x8000808b, 0x00000000], [0x0000008b, 0x80000000], [0x00008089, 0x80000000], [0x00008003, 0x80000000],
  [0x00008002, 0x80000000], [0x00000080, 0x80000000], [0x0000800a, 0x00000000], [0x8000000a, 0x80000000],
  [0x80008081, 0x80000000], [0x00008080, 0x80000000], [0x80000001, 0x00000000], [0x80008008, 0x80000000],
];
const ROT = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44];
const PI = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1];

function keccakF(lo, hi) {
  const bcL = new Int32Array(5), bcH = new Int32Array(5);
  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) {
      bcL[x] = lo[x] ^ lo[x + 5] ^ lo[x + 10] ^ lo[x + 15] ^ lo[x + 20];
      bcH[x] = hi[x] ^ hi[x + 5] ^ hi[x + 10] ^ hi[x + 15] ^ hi[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      const a = (x + 4) % 5, b = (x + 1) % 5;
      const tl = bcL[a] ^ ((bcL[b] << 1) | (bcH[b] >>> 31));
      const th = bcH[a] ^ ((bcH[b] << 1) | (bcL[b] >>> 31));
      for (let y = 0; y < 25; y += 5) { lo[y + x] ^= tl; hi[y + x] ^= th; }
    }
    let tl = lo[1], th = hi[1];
    for (let i = 0; i < 24; i++) {
      const j = PI[i];
      const r = ROT[i];
      const nl = lo[j], nh = hi[j];
      if (r < 32) { lo[j] = (tl << r) | (th >>> (32 - r)); hi[j] = (th << r) | (tl >>> (32 - r)); }
      else if (r === 32) { lo[j] = th; hi[j] = tl; }
      else { const s = r - 32; lo[j] = (th << s) | (tl >>> (32 - s)); hi[j] = (tl << s) | (th >>> (32 - s)); }
      tl = nl; th = nh;
    }
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) { bcL[x] = lo[y + x]; bcH[x] = hi[y + x]; }
      for (let x = 0; x < 5; x++) {
        lo[y + x] ^= ~bcL[(x + 1) % 5] & bcL[(x + 2) % 5];
        hi[y + x] ^= ~bcH[(x + 1) % 5] & bcH[(x + 2) % 5];
      }
    }
    lo[0] ^= RC[round][0]; hi[0] ^= RC[round][1];
  }
}

/** @param {Uint8Array} data @returns {Uint8Array} 32-byte Keccak-256 digest */
export function keccak256(data) {
  const rate = 136;
  const lo = new Int32Array(25), hi = new Int32Array(25);
  const padded = new Uint8Array(Math.ceil((data.length + 1) / rate) * rate);
  padded.set(data);
  padded[data.length] = 0x01;
  padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      const o = off + i * 8;
      lo[i] ^= padded[o] | (padded[o + 1] << 8) | (padded[o + 2] << 16) | (padded[o + 3] << 24);
      hi[i] ^= padded[o + 4] | (padded[o + 5] << 8) | (padded[o + 6] << 16) | (padded[o + 7] << 24);
    }
    keccakF(lo, hi);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    for (let b = 0; b < 4; b++) { out[i * 8 + b] = (lo[i] >>> (8 * b)) & 255; out[i * 8 + 4 + b] = (hi[i] >>> (8 * b)) & 255; }
  }
  return out;
}

export function keccak256Hex(data) {
  return '0x' + Array.from(keccak256(data), (b) => b.toString(16).padStart(2, '0')).join('');
}
