/**
 * Admin yuborgan matndan savollarni ajratib oladi.
 * Savollar orasida bitta bo'sh qator bo'lishi kerak:
 *
 *   1. 5 + 3 = ?
 *   A) 7
 *   B) 8
 *   C) 9
 *   D) 10
 *   Javob: B
 *
 * To'g'ri javobni "Javob: B" qatori bilan yoki variant oldiga * qo'yib (*B) 8) belgilash mumkin.
 */
const LETTERS = 'abcdef';

function parseQuestions(raw) {
  const blocks = String(raw || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const questions = [];
  const errors = [];

  blocks.forEach((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const body = [];
    const options = [];
    let correct = -1;

    for (const line of lines) {
      let m = line.match(/^(?:javob|to['‘’`]?g['‘’`]?ri javob|j|answer)\s*[:\-–]\s*([a-f])\b/i);
      if (m) {
        correct = LETTERS.indexOf(m[1].toLowerCase());
        continue;
      }
      m = line.match(/^([*+])?\s*([a-f])\s*[).]\s*(.+)$/i);
      if (m && body.length && LETTERS.indexOf(m[2].toLowerCase()) === options.length) {
        if (m[1]) correct = options.length;
        options.push(m[3].trim());
        continue;
      }
      if (options.length) options[options.length - 1] += ` ${line}`;
      else body.push(line);
    }

    const text = body.join('\n').replace(/^\d+\s*[.)]\s*/, '').trim();
    const n = bi + 1;
    if (!text) errors.push(`${n}-savol: savol matni topilmadi`);
    else if (options.length < 2) errors.push(`${n}-savol: kamida 2 ta variant kerak`);
    else if (correct < 0 || correct >= options.length) errors.push(`${n}-savol: to'g'ri javob ko'rsatilmagan`);
    else questions.push({ body: text, options, correct });
  });

  return { questions, errors };
}

module.exports = { parseQuestions, LETTERS };
