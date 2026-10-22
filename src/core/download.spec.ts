import { downloadFile, timestampedName } from './download';

describe('download', () => {
  it('builds a filesystem-safe timestamped name', () => {
    expect(timestampedName('gadget-log', 'ndjson', new Date('2026-10-22T13:10:47.135Z'))).toBe(
      'gadget-log-2026-10-22T13-10-47-135Z.ndjson',
    );
  });

  it('downloads the content under the given name and releases the object URL', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => ((blob = b), 'blob:fake'));
    URL.revokeObjectURL = vi.fn();
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });

    downloadFile('a.csv', 'x,y\n1,2\n', 'text/csv');

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('a.csv');
    expect(clicked[0].href).toBe('blob:fake');
    expect(blob?.type).toBe('text/csv');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    expect(text).toBe('x,y\n1,2\n');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    vi.restoreAllMocks();
  });
});
