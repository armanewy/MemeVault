import { describe, expect, it } from 'vitest';
import {
  EMAIL_REGEX,
  HANDLE_REGEX,
  PHONE_REGEX,
  URL_REGEX,
  suggestRedactionBoxesFromBlocks
} from '../src/main/services/redactionPatterns';

describe('redaction patterns', () => {
  it('detects email addresses', () => {
    expect(EMAIL_REGEX.test('send to alex@example.com')).toBe(true);
  });

  it('detects phone numbers', () => {
    expect(PHONE_REGEX.test('call (212) 555-0199')).toBe(true);
  });

  it('detects handles', () => {
    expect(HANDLE_REGEX.test('@memevault')).toBe(true);
  });

  it('detects URLs', () => {
    expect(URL_REGEX.test('visit https://example.com/path')).toBe(true);
  });

  it('returns OCR boxes for sensitive text and likely names before handles', () => {
    const boxes = suggestRedactionBoxesFromBlocks([
      { id: '1', assetId: 'a', text: 'Alex', x: 1, y: 1, width: 10, height: 10, blockType: 'word' },
      { id: '2', assetId: 'a', text: '@alex', x: 12, y: 1, width: 10, height: 10, blockType: 'word' }
    ]);
    expect(boxes).toHaveLength(2);
  });
});

