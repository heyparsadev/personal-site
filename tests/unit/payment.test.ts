import { describe, it, expect } from 'vitest';
import { frontmatter } from '../helpers/frontmatter';
import { groupIban, paySchema, validBech32, validBic, validIban } from '../../src/lib/payment';
import { payCtx } from '../../src/lib/page-ctx';

describe('payment details', () => {
  it('checks an IBAN by its mod-97 check digits', () => {
    expect(validIban('MT98CFTE28004000000000005059076')).toBe(true);
    expect(validIban('MT98 CFTE 2800 4000 0000 0000 5059 076')).toBe(true);
    expect(validIban('GB82WEST12345698765432')).toBe(true);
    expect(validIban('MT98CFTE28004000000000005059077')).toBe(false);
    expect(validIban('MT98CFTE2800400000000000505907')).toBe(false);
  });

  it('checks the shape of a BIC', () => {
    expect(validBic('CFTEMTM1')).toBe(true);
    expect(validBic('DEUTDEFF500')).toBe(true);
    expect(validBic('CFTEMTM')).toBe(false);
  });

  it('checks a bech32 bitcoin address by its checksum', () => {
    expect(validBech32('bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7')).toBe(true);
    expect(validBech32('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4')).toBe(true);
    expect(validBech32('bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj8')).toBe(false);
    expect(validBech32('bc1Q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7')).toBe(false);
  });

  it('groups an IBAN in fours for reading', () => {
    expect(groupIban('MT98CFTE28004000000000005059076')).toBe('MT98 CFTE 2800 4000 0000 0000 5059 076');
  });

  it('accepts the payment page’s content, and rejects a typo in its IBAN', () => {
    const fm = frontmatter('content/site/pay.md');
    expect(paySchema.safeParse(fm).success).toBe(true);
    const typo = structuredClone(fm);
    typo.methods[0].fields[1].value = 'MT98CFTE28004000000000005059077';
    expect(paySchema.safeParse(typo).success).toBe(false);
  });

  it('holds exactly the details Parsa gave', () => {
    const fields = frontmatter('content/site/pay.md').methods.flatMap((m: { fields: { value: string }[] }) => m.fields.map((f) => f.value));
    expect(fields).toEqual(['Parsa Kharazmian', 'MT98CFTE28004000000000005059076', 'CFTEMTM1', 'kzn.parsa@gmail.com', 'bc1q77j8tjzjx80ex7suuvgg6rc8uxtwj6dljukzj7']);
  });

  it('gives the island the page’s name', () => {
    expect(payCtx()).toMatchObject({ kind: 'project', key: 'pay', title: 'Payment details', glyph: 'card', sections: [] });
  });
});
