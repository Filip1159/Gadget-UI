/** Building blocks shared by the frame parsers. Every helper is strict: anything doubtful is `undefined`. */

export type Fields = Map<string, string>;

/**
 * Splits `KEY=value` tokens into a map. Undefined if a token has no `=`, an empty key, or more than one `=`,
 * or (unless `allowDuplicates`) if a key appears twice.
 */
export const keyValueFields = (tokens: string[], { allowDuplicates = false } = {}): Fields | undefined => {
  const fields: Fields = new Map();
  for (const token of tokens) {
    const [key, value, ...rest] = token.split('=');
    if (!key || value === undefined || rest.length > 0 || (!allowDuplicates && fields.has(key))) {
      return undefined;
    }
    fields.set(key, value);
  }
  return fields;
};

/** A whole number field: digits only, with an optional leading minus if `signed`. */
export const intField = (fields: Fields, key: string, { signed = false } = {}): number | undefined => {
  const raw = fields.get(key);
  return raw !== undefined && (signed ? /^-?\d+$/ : /^\d+$/).test(raw) ? parseInt(raw, 10) : undefined;
};

/** A finite decimal number field (no empty string, NaN or Infinity). */
export const numberField = (fields: Fields, key: string): number | undefined => {
  const raw = fields.get(key);
  const n = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(n) ? n : undefined;
};
