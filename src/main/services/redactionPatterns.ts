import type { OcrBlock, RedactionBox } from '../types/domain';

export const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
export const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/;
export const HANDLE_REGEX = /(^|\s)@[A-Za-z0-9_]{2,30}\b/;
export const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s<>"']+/i;

export function detectSensitiveText(text: string): boolean {
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text) || HANDLE_REGEX.test(text) || URL_REGEX.test(text);
}

function isLikelyName(text: string): boolean {
  return /^[A-Z][a-z]{1,24}$/.test(text.trim());
}

export function suggestRedactionBoxesFromBlocks(blocks: OcrBlock[]): RedactionBox[] {
  const boxes: RedactionBox[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!detectSensitiveText(block.text)) continue;
    boxes.push({
      id: block.id,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      label: block.text
    });
    const previous = blocks[index - 1];
    if (HANDLE_REGEX.test(block.text) && previous && isLikelyName(previous.text)) {
      boxes.push({
        id: `${previous.id}-name`,
        x: previous.x,
        y: previous.y,
        width: previous.width,
        height: previous.height,
        label: previous.text
      });
    }
  }
  return boxes;
}

