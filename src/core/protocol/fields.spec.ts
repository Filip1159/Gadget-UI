import { intField, keyValueFields, numberField } from './fields';

describe('keyValueFields', () => {
  it('splits KEY=value tokens, keeping empty values', () => {
    expect(keyValueFields(['A=1', 'B=', 'C=x'])).toEqual(
      new Map([
        ['A', '1'],
        ['B', ''],
        ['C', 'x'],
      ]),
    );
    expect(keyValueFields([])).toEqual(new Map());
  });

  it('rejects a token with no =, an empty key, or a second =', () => {
    expect(keyValueFields(['A'])).toBeUndefined();
    expect(keyValueFields(['=1'])).toBeUndefined();
    expect(keyValueFields(['A=1=2'])).toBeUndefined();
  });

  it('rejects duplicate keys unless told otherwise', () => {
    expect(keyValueFields(['A=1', 'A=2'])).toBeUndefined();
    expect(keyValueFields(['A=1', 'A=2'], { allowDuplicates: true })).toEqual(
      new Map([['A', '2']]),
    );
  });
});

describe('intField', () => {
  const fields = new Map([
    ['U', '12'],
    ['S', '-12'],
    ['F', '1.5'],
    ['E', ''],
    ['X', '1e3'],
    ['P', '+4'],
  ]);

  it('reads whole numbers; only signed fields may be negative', () => {
    expect(intField(fields, 'U')).toBe(12);
    expect(intField(fields, 'S', { signed: true })).toBe(-12);
    expect(intField(fields, 'U', { signed: true })).toBe(12);
    expect(intField(fields, 'S')).toBeUndefined();
  });

  it('rejects decimals, empty, exponents, plus signs and missing keys', () => {
    for (const key of ['F', 'E', 'X', 'P', 'missing']) {
      expect(intField(fields, key, { signed: true })).toBeUndefined();
    }
  });
});

describe('numberField', () => {
  const fields = new Map([
    ['A', '0.15'],
    ['B', '-2'],
    ['E', ''],
    ['N', 'NaN'],
    ['I', 'Infinity'],
    ['J', 'abc'],
  ]);

  it('reads finite decimals', () => {
    expect(numberField(fields, 'A')).toBe(0.15);
    expect(numberField(fields, 'B')).toBe(-2);
  });

  it('rejects empty, NaN, Infinity, junk and missing keys', () => {
    for (const key of ['E', 'N', 'I', 'J', 'missing']) {
      expect(numberField(fields, key)).toBeUndefined();
    }
  });
});
