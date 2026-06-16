/**
 * Pure base64 payload decoder (no network). Extracts the readable comment text
 * carried by a Fragment transaction cell.
 */

/** Pad a base64 string with `=` up to a multiple of 4. */
function padBase64(s: string): string {
  return s + "=".repeat((4 - (s.length % 4)) % 4);
}

/**
 * Find the first run of printable characters (ASCII 0x20–0x7E plus tab/CR/LF)
 * at least `minLen` long.
 */
function findPrintableText(buf: Buffer, minLen = 3): string | null {
  // latin1 maps each byte 1:1 to a char, so the regex sees the raw bytes.
  const s = buf.toString("latin1");
  const pattern = new RegExp(`[\\t\\r\\n\\x20-\\x7E]{${minLen},}`);
  const match = s.match(pattern);
  return match ? match[0] : null;
}

/**
 * Decode a Fragment transaction `payload` (base64 cell) into the readable
 * comment text it carries, e.g. `"50 Telegram Stars\n\nRef#Im2y5itd6"`.
 */
export function decodePayload(payload: string): string {
  const padded = padBase64(payload.trim());

  let raw: Buffer;
  try {
    raw = Buffer.from(padded, "base64");
  } catch {
    raw = Buffer.from(payload, "utf-8");
  }

  const cleaned = findPrintableText(raw, 3);
  if (cleaned) {
    return cleaned.replace(/^[\r\n]+|[\r\n]+$/g, "");
  }

  const decodedUtf = raw.toString("utf-8").trim();
  if (decodedUtf) return decodedUtf;

  return raw.toString("hex");
}
