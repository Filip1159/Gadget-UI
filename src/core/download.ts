/** `<prefix>-<ISO time, filesystem safe>.<extension>`, e.g. gadget-log-2026-10-22T13-10-47-135Z.ndjson */
export const timestampedName = (prefix: string, extension: string, now = new Date()): string =>
  `${prefix}-${now.toISOString().replace(/[:.]/g, '-')}.${extension}`;

/** Saves `content` as a file through the browser's download mechanism. */
export const downloadFile = (name: string, content: string, mimeType: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
