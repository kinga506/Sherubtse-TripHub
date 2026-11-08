const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLocalStorage } = require('../services/storage/local');

test('private local storage round trip and prevent traversal', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'triphub-storage-'));
  try {
    const storage = createLocalStorage(folder);
    const uploaded = await storage.put(Buffer.from('private test content'));
    expect(uploaded.key).toMatch(/^[a-f0-9]{32}$/);
    expect((await storage.get(uploaded.key)).toString()).toBe('private test content');
    await expect(storage.get('../.env')).rejects.toThrow(/Invalid private object key/);
    await storage.delete(uploaded.key);
    await expect(storage.get(uploaded.key)).rejects.toThrow();
  } finally {
    await fs.rm(folder, { recursive: true, force: true });
  }
});
