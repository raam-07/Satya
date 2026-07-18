// Safe font loader for OG image (edge) routes.
//
// The `fetch(new URL('../../public/fonts/x.ttf', import.meta.url))` pattern
// resolves correctly on Vercel but NOT on Render/`next start`, where it can
// return an HTML page. Feeding those bytes to Satori's font parser throws
// "Unsupported OpenType signature" and crashes the whole card. This validates
// the magic bytes and returns null on anything that isn't a real font, so the
// card falls back to system fonts instead of 500-ing.
export async function loadOgFont(url: URL | string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 256) return null // too small to be a real font
    const sig = new Uint8Array(buf, 0, 4)
    const u32 = (sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]
    // Valid font magic numbers: 0x00010000 (TTF), 'OTTO', 'true', 'ttcf', 'wOFF', 'wOF2'
    const ok =
      u32 === 0x00010000 ||
      u32 === 0x4f54544f || // OTTO
      u32 === 0x74727565 || // true
      u32 === 0x74746366 || // ttcf
      u32 === 0x774f4646 || // wOFF
      u32 === 0x774f4632    // wOF2
    return ok ? buf : null
  } catch {
    return null
  }
}
