import assert from 'node:assert/strict';
import test from 'node:test';
import LocalDocumentService from '../src/services/localDocumentService';
import { AppError } from '../src/utils/appError';

test('LocalDocumentService parses text files into local document input', async () => {
  const service = new LocalDocumentService();
  const result = await service.parseUploadedFile({
    originalName: 'Refund PRD.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Refund PRD\n\nSales should confirm the refund reason.', 'utf8'),
  });

  assert.equal(result.source, 'local_file');
  assert.match(result.sourceDocId, /^local_[a-f0-9]{64}$/);
  assert.equal(result.title, 'Refund PRD');
  assert.equal(result.content, '# Refund PRD\n\nSales should confirm the refund reason.');
  assert.equal(result.metadata.fileName, 'Refund PRD.md');
  assert.equal(result.metadata.mimeType, 'text/markdown');
  assert.equal(result.metadata.fileSize, 53);
  assert.match(result.metadata.contentHash, /^[a-f0-9]{64}$/);
});

test('LocalDocumentService rejects unsupported file types', async () => {
  const service = new LocalDocumentService();

  await assert.rejects(
    () =>
      service.parseUploadedFile({
        originalName: 'archive.zip',
        mimeType: 'application/zip',
        buffer: Buffer.from('not a document'),
      }),
    (error) =>
      error instanceof AppError &&
      error.code === 'unsupported_file_type' &&
      error.status === 400,
  );
});
