const path = require('path');
const logger = require('../utils/logger');

const STANDARD_FONT_DATA_URL = path.join(
  path.dirname(require.resolve('pdfjs-dist/package.json')),
  'standard_fonts'
) + path.sep;

let pdfjsLibPromise = null;

/**
 * pdfjs-dist ships ESM-only from v4+, but this module (and the rest of
 * backend/ai) is CommonJS. Dynamic import() is the supported way to load an
 * ESM package from a CJS file, so we lazily import once and cache the module.
 */
function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

/**
 * Extracts raw text content from a PDF file buffer using pdfjs-dist
 * (the actively maintained Mozilla PDF.js build). We deliberately avoid the
 * 'pdf-parse' package here: it bundles a frozen ~2018 pdfjs build that fails
 * with "bad XRef entry" on PDFs using compressed cross-reference streams -
 * a common feature in PDFs exported from Word, Google Docs, etc.
 */
async function parsePdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid input: expected a PDF file buffer');
  }

  try {
    const pdfjsLib = await getPdfjsLib();
    const doc = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      standardFontDataUrl: STANDARD_FONT_DATA_URL
    }).promise;

    const pageTexts = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      pageTexts.push(pageText);
    }

    const metadata = await doc.getMetadata().catch(() => ({ info: {} }));

    const cleanedText = pageTexts.join('\n\n')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText) {
      throw new Error('PDF parsed successfully but contained no extractable text');
    }

    return {
      text: cleanedText,
      numPages: doc.numPages,
      info: metadata.info || {}
    };
  } catch (err) {
    logger.error('Failed to parse PDF buffer', err);
    throw err;
  }
}

module.exports = {
  parsePdfBuffer
};
