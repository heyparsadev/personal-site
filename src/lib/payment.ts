import { z } from 'astro/zod';

// Payment details are only useful if they are exactly right, so each kind of value is checked by its own rule at
// build time: a mistyped IBAN or bitcoin address fails the build instead of reaching a client.

/** ISO 13616: move the country and check digits to the end, letters to numbers, and the result mod 97 is 1. */
export function validIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** A BIC: four letters for the bank, two for the country, two for the place, and an optional three for a branch. */
export const validBic = (bic: string): boolean => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);

const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/** A native SegWit (bech32, BIP-173) bitcoin address: all one case, the bc prefix, and a valid checksum. */
export function validBech32(raw: string): boolean {
  if (raw !== raw.toLowerCase() && raw !== raw.toUpperCase()) return false;
  const addr = raw.toLowerCase();
  const sep = addr.lastIndexOf('1');
  const hrp = addr.slice(0, sep);
  const data = [...addr.slice(sep + 1)].map((c) => BECH32.indexOf(c));
  if (hrp !== 'bc' || data.length < 7 || data.includes(-1)) return false;
  let chk = 1;
  for (const v of [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31), ...data]) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk === 1;
}

/** An IBAN in groups of four, the way banks print it. */
export const groupIban = (iban: string): string => iban.replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');

const CHECKS = { iban: validIban, bic: validBic, btc: validBech32, email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) };

const field = z
  .object({ label: z.string(), value: z.string(), kind: z.enum(['iban', 'bic', 'btc', 'email']).optional() })
  .superRefine((f, ctx) => {
    if (f.kind && !CHECKS[f.kind](f.value)) ctx.addIssue({ code: 'custom', message: `${f.label} is not a valid ${f.kind}: check it for a typo` });
  });

/** content/site/pay.md: the page Parsa sends to clients (/pay). */
export const paySchema = z.object({
  title: z.string(),
  intro: z.string(),
  /** `meta` is the stage's HUD: the currency and the network, in Monoglyph's uppercase. */
  methods: z.array(z.object({ name: z.string(), logo: z.enum(['sepa', 'paypal', 'bitcoin']).optional(), meta: z.array(z.string()).default([]), note: z.string(), fields: z.array(field).min(1) })).min(1),
  reference: z.string(),
  contact: z.object({ text: z.string(), email: z.string() }),
});
