// Resolve user-friendly memory references: "0xB400", "score", "out[3]", "bytes[2]" -> address.
// `ram` is the compiler's RAM map: { name: {addr, bytes, type: "word" | "word[]" | "byte[]"} }.

export function resolveAddr(spec, ram = {}) {
  if (typeof spec === 'number') return spec;
  const s = String(spec).trim();
  if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = /^([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?$/.exec(s);
  if (m && ram[m[1]]) {
    const r = ram[m[1]];
    const i = m[2] ? parseInt(m[2], 10) : 0;
    const elem = r.type === 'byte[]' ? 1 : 2;
    if (i * elem >= r.bytes) throw new Error(`${s}: index ${i} is out of range (${r.type}, ${r.bytes} bytes)`);
    return r.addr + i * elem;
  }
  const known = Object.keys(ram);
  throw new Error(`cannot resolve "${s}" to an address${known.length ? ` (known variables: ${known.join(', ')})` : ' (give a number like 0xB400, or build from source so variable names are known)'}`);
}

/**
 * A stop condition for a run: "state==6", "score>=100", "lives<1", "hero_x!=0". Returns {name, addr, bytes, test(value)} or throws a
 * message that names the problem. The value read is a signed word (or a byte for a byte array).
 */
export function parseUntil(text, ram = {}) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*(?:\[\d+\])?|0x[0-9a-fA-F]+)\s*(==|!=|>=|<=|>|<)\s*(-?\d+|0x[0-9a-fA-F]+)\s*$/.exec(String(text));
  if (!m) throw new Error(`"until" must look like state==6 or score>=100 (a variable, one of == != >= <= > <, and a number); got "${text}"`);
  const name = m[1], op = m[2], want = Number(m[3]);
  const addr = resolveAddr(name, ram);
  const base = name.replace(/\[.*$/, '');
  const bytes = ram[base]?.type === 'byte[]' ? 1 : 2;
  const test = { '==': (v) => v === want, '!=': (v) => v !== want, '>=': (v) => v >= want, '<=': (v) => v <= want, '>': (v) => v > want, '<': (v) => v < want }[op];
  return { name, addr, bytes, op, want, test };
}
