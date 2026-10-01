import { createHmac } from "node:crypto";

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — what authenticator apps compute. */
export function totp(base32Secret: string, offsetSteps = 0): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Math.floor(Date.now() / 30_000) + offsetSteps;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Wait until the 30 s window after `afterMs` begins, then return that window's code
 *  (servers reject a code that was already used, so the test must wait like a person). */
export async function freshTotp(
  base32Secret: string,
  afterMs: number,
): Promise<string> {
  const nextWindow = (Math.floor(afterMs / 30_000) + 1) * 30_000;
  const wait = nextWindow - Date.now() + 200;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return totp(base32Secret);
}
