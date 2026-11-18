// On-chain storage planning: split a cartridge into SSTORE2-style chunk contracts (see CONTRACTS.md).
// Each chunk's deployed code is 0x00 followed by up to 24,575 bytes of cartridge data.

import { keccak256, keccak256Hex } from './keccak.js';

export const CHUNK_PAYLOAD_MAX = 24575;

const hex = (u8) => '0x' + Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');

/** Creation code that deploys `0x00 ++ payload` as a contract's runtime code (the Solady/SSTORE2 pattern). */
export function chunkInitcode(payload) {
  const len = payload.length + 1;
  if (len > 24576) throw new Error('chunk payload too large');
  // PUSH2 len; DUP1; PUSH1 0x0a; RETURNDATASIZE; CODECOPY; RETURNDATASIZE; RETURN | 0x00 ++ payload
  const head = Uint8Array.from([0x61, len >> 8, len & 255, 0x80, 0x60, 0x0a, 0x3d, 0x39, 0x3d, 0xf3, 0x00]);
  const out = new Uint8Array(head.length + payload.length);
  out.set(head);
  out.set(payload, head.length);
  return out;
}

function calldataGas(bytes) {
  let g = 0;
  for (const b of bytes) g += b === 0 ? 4 : 16;
  return g;
}

/** Plan the chunk contracts for a cartridge image. */
export function planChunks(rom) {
  const chunks = [];
  for (let off = 0; off < rom.length; off += CHUNK_PAYLOAD_MAX) {
    const payload = rom.slice(off, Math.min(rom.length, off + CHUNK_PAYLOAD_MAX));
    const init = chunkInitcode(payload);
    chunks.push({
      index: chunks.length,
      offset: off,
      size: payload.length,
      payloadHash: keccak256Hex(payload),
      salt: keccak256Hex(payload),
      initcodeHash: keccak256Hex(init),
      initcode: hex(init),
      // 21000 base + 32000 create + 200 per deployed byte + calldata + a little for memory/execution
      estimatedGas: 21000 + 32000 + 200 * (payload.length + 1) + calldataGas(init) + 5000,
    });
  }
  return {
    romSize: rom.length,
    romHash: keccak256Hex(rom),
    chunkPayloadMax: CHUNK_PAYLOAD_MAX,
    chunks,
    totalEstimatedGas: chunks.reduce((a, c) => a + c.estimatedGas, 0),
  };
}

/** Reassemble a cartridge from chunk runtime codes (each starting with 0x00). */
export function assembleFromChunkCodes(codes, romSize) {
  const parts = codes.map((c) => {
    if (c[0] !== 0x00) throw new Error('chunk code must start with 0x00');
    return c.slice(1);
  });
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out.slice(0, romSize);
}

const unhex = (h) => Uint8Array.from((h.replace(/^0x/, '').match(/../g) || []).map((x) => parseInt(x, 16)));
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const word = (n) => { const w = new Uint8Array(32); for (let i = 31, v = BigInt(n); i >= 0; i--, v >>= 8n) w[i] = Number(v & 255n); return w; };

/** The address a chunk will have when `ChunkDeployer` at `deployer` deploys it (CREATE2, salt = keccak256(payload)). */
export function predictChunkAddress(deployer, chunk) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(deployer)) throw new Error('deployer must be a 0x-prefixed 20-byte address');
  const h = keccak256(concat(Uint8Array.of(0xff), unhex(deployer), unhex(chunk.salt), unhex(chunk.initcodeHash)));
  return '0x' + Array.from(h.slice(12), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Calldata for `ChunkDeployer.deploy(bytes payload)`: selector, offset, length, the bytes padded to 32. */
export function chunkDeployCalldata(payload) {
  const selector = keccak256(new TextEncoder().encode('deploy(bytes)')).slice(0, 4);
  const pad = new Uint8Array((32 - (payload.length % 32)) % 32);
  return hex(concat(selector, word(32), word(payload.length), payload, pad));
}

/**
 * Everything needed to put a cartridge on chain: for each chunk its `deploy` calldata and (given the address of a
 * ChunkDeployer) its predicted address, plus the ordered address list a VlyFactory.create config needs.
 */
export function deployBundle(rom, deployer) {
  const plan = planChunks(rom);
  const chunks = plan.chunks.map((c) => {
    const payload = rom.slice(c.offset, c.offset + c.size);
    return { index: c.index, size: c.size, payloadHash: c.payloadHash, calldata: chunkDeployCalldata(payload), address: deployer ? predictChunkAddress(deployer, c) : undefined };
  });
  return {
    romSize: plan.romSize,
    romHash: plan.romHash,
    specVersion: rom[2],
    deployer: deployer || null,
    chunks,
    chunkAddresses: deployer ? chunks.map((c) => c.address) : null,
  };
}
