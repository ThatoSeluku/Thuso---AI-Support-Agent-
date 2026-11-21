import { SmallStep, TriggerNote } from '../types.ts';

interface PdfLineSpec {
  text: string;
  font: 'F1' | 'F2';
  size: number;
  color: [number, number, number];
  leading: number;
  indent?: number;
}

function formatIsoDateForFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatReadableDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeForPdf(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00B7/g, '|')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function escapePdfString(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
  const cleaned = normalizeForPdf(text);
  if (!cleaned) return [''];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function buildRecordsText(
  steps: SmallStep[],
  triggers: TriggerNote[],
  exportedAt = new Date()
): string {
  const completedCount = steps.filter((s) => s.completed).length;
  const lines: string[] = [
    'THUSO - MY SMALL STEPS & TRIGGER NOTES',
    `Exported on ${formatReadableDate(exportedAt)}`,
    'Private offline record generated on your device. Nothing was sent to a server.',
    '====================================================================',
    '',
    `MY SMALL STEPS (${steps.length} total, ${completedCount} completed)`,
    '--------------------------------------------------------------------',
  ];

  if (steps.length === 0) {
    lines.push('No small steps saved yet.');
  } else {
    steps.forEach((step, idx) => {
      const status = step.completed ? '[Done]' : '[In progress]';
      lines.push(`${idx + 1}. ${status} ${step.text}`);
      lines.push(`   Added: ${step.createdAt}`);
    });
  }

  lines.push('');
  lines.push(`SPOTTING TRIGGERS & PATTERNS (${triggers.length} notes)`);
  lines.push('--------------------------------------------------------------------');

  if (triggers.length === 0) {
    lines.push('No trigger notes saved yet.');
  } else {
    triggers.forEach((note, idx) => {
      lines.push(`${idx + 1}. Trigger (${note.createdAt}): ${note.situation}`);
      if (note.thought) {
        lines.push(`   Thought: "${note.thought}"`);
      }
      lines.push(`   Safer move: ${note.helpfulAction}`);
    });
  }

  lines.push('');
  lines.push('====================================================================');
  lines.push('Free 24/7 South African Emergency & Support Lines:');
  lines.push('- SAPS Emergency: 10111  |  Mobile Emergency: 112');
  lines.push('- SADAG Suicide Crisis Line: 0800 567 567 (SMS 31393)');
  lines.push('- Substance Abuse Helpline (SANCA/DSD): 0800 12 13 14 (SMS 32312)');
  lines.push('- GBV Command Centre: 0800 428 428 (*120*7867#)');
  lines.push('- Childline South Africa: 116');
  lines.push('');

  return lines.join('\n');
}

export function buildRecordsPdfBytes(
  steps: SmallStep[],
  triggers: TriggerNote[],
  exportedAt = new Date()
): Uint8Array {
  const completedCount = steps.filter((s) => s.completed).length;

  const DEEP_BLUE: [number, number, number] = [0.122, 0.227, 0.373]; // #1f3a5f
  const SLATE_BLUE: [number, number, number] = [0.29, 0.384, 0.502]; // #4a6280
  const ACTION_BLUE: [number, number, number] = [0.239, 0.416, 0.62]; // #3d6a9e

  const items: Array<PdfLineSpec | { divider: true }> = [
    {
      text: 'Thuso - My Small Steps & Trigger Notes',
      font: 'F2',
      size: 18,
      color: DEEP_BLUE,
      leading: 24,
    },
    {
      text: `Exported on ${formatReadableDate(exportedAt)} | Offline & private on your device`,
      font: 'F1',
      size: 10,
      color: SLATE_BLUE,
      leading: 18,
    },
    { divider: true },
    {
      text: `My Small Steps (${steps.length} saved, ${completedCount} completed)`,
      font: 'F2',
      size: 13,
      color: DEEP_BLUE,
      leading: 20,
    },
  ];

  if (steps.length === 0) {
    items.push({
      text: 'No small steps saved yet.',
      font: 'F1',
      size: 10.5,
      color: SLATE_BLUE,
      leading: 16,
    });
  } else {
    steps.forEach((step, idx) => {
      const status = step.completed ? '[Done]' : '[In progress]';
      const wrapped = wrapText(`${idx + 1}. ${status} ${step.text}`, 80);
      wrapped.forEach((line, lineIdx) => {
        items.push({
          text: line,
          font: lineIdx === 0 ? 'F2' : 'F1',
          size: 10.5,
          color: DEEP_BLUE,
          leading: 14.5,
          indent: lineIdx === 0 ? 0 : 12,
        });
      });
      items.push({
        text: `Added ${step.createdAt}`,
        font: 'F1',
        size: 9.5,
        color: SLATE_BLUE,
        leading: 16,
        indent: 12,
      });
    });
  }

  items.push({ divider: true });
  items.push({
    text: `Spotting Triggers & Patterns (${triggers.length} notes)`,
    font: 'F2',
    size: 13,
    color: DEEP_BLUE,
    leading: 20,
  });

  if (triggers.length === 0) {
    items.push({
      text: 'No trigger notes saved yet.',
      font: 'F1',
      size: 10.5,
      color: SLATE_BLUE,
      leading: 16,
    });
  } else {
    triggers.forEach((note, idx) => {
      const sitLines = wrapText(`${idx + 1}. ${note.situation}`, 80);
      sitLines.forEach((line, lineIdx) => {
        items.push({
          text: line,
          font: 'F2',
          size: 10.5,
          color: DEEP_BLUE,
          leading: 14.5,
          indent: lineIdx === 0 ? 0 : 12,
        });
      });

      items.push({
        text: `Recorded ${note.createdAt}`,
        font: 'F1',
        size: 9.5,
        color: SLATE_BLUE,
        leading: 14,
        indent: 12,
      });

      if (note.thought) {
        const thoughtLines = wrapText(`Thought: "${note.thought}"`, 76);
        thoughtLines.forEach((line) => {
          items.push({
            text: line,
            font: 'F1',
            size: 10,
            color: SLATE_BLUE,
            leading: 14,
            indent: 12,
          });
        });
      }

      const moveLines = wrapText(`Safer move: ${note.helpfulAction}`, 76);
      moveLines.forEach((line) => {
        items.push({
          text: line,
          font: 'F2',
          size: 10,
          color: ACTION_BLUE,
          leading: 15.5,
          indent: 12,
        });
      });

      items.push({
        text: '',
        font: 'F1',
        size: 6,
        color: DEEP_BLUE,
        leading: 6,
      });
    });
  }

  // Paginate onto A4 pages (595.28 x 841.89 pt)
  const leftMargin = 50;
  const startY = 788;
  const minY = 70;
  const pages: string[][] = [[]];
  let cursorY = startY;

  const pushCommand = (cmd: string) => {
    pages[pages.length - 1].push(cmd);
  };

  for (const item of items) {
    if ('divider' in item) {
      if (cursorY < minY + 24) {
        pages.push([]);
        cursorY = startY;
      }
      cursorY -= 6;
      pushCommand(
        `q 0.863 0.890 0.925 RG 0.8 w ${leftMargin} ${cursorY.toFixed(2)} m 545.28 ${cursorY.toFixed(2)} l S Q`
      );
      cursorY -= 16;
      continue;
    }

    if (cursorY - item.leading < minY) {
      pages.push([]);
      cursorY = startY;
    }

    if (item.text) {
      const x = leftMargin + (item.indent ?? 0);
      const [r, g, b] = item.color;
      const safe = escapePdfString(normalizeForPdf(item.text));
      pushCommand(
        `BT /${item.font} ${item.size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 1 0 0 1 ${x} ${cursorY.toFixed(2)} Tm (${safe}) Tj ET`
      );
    }
    cursorY -= item.leading;
  }

  // Add subtle footer with offline note and page numbers
  const totalPages = pages.length;
  pages.forEach((cmds, pageIdx) => {
    const footerText = `Thuso Offline Record | Free SA Helplines: 10111, SADAG 0800 567 567, SANCA 0800 12 13 14 | Page ${pageIdx + 1} of ${totalPages}`;
    cmds.push(
      `BT /F1 8.5 Tf 0.290 0.384 0.502 rg 1 0 0 1 ${leftMargin} 38.00 Tm (${escapePdfString(footerText)}) Tj ET`
    );
  });

  // Assemble PDF objects with exact UTF-8 byte offsets
  const encoder = new TextEncoder();
  const pageCount = pages.length;
  const pageObjectIds = pages.map((_, idx) => 5 + idx * 2);

  const objects: string[] = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] >>\nendobj\n`,
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
  ];

  pages.forEach((cmds, idx) => {
    const pageId = 5 + idx * 2;
    const contentId = pageId + 1;
    const streamBody = cmds.join('\n') + '\n';
    const streamBytes = encoder.encode(streamBody).length;

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${streamBody}endstream\nendobj\n`
    );
  });

  const chunks: Uint8Array[] = [];
  const header = encoder.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  chunks.push(header);
  let byteOffset = header.length;
  const offsets: number[] = [];

  for (const objStr of objects) {
    offsets.push(byteOffset);
    const bytes = encoder.encode(objStr);
    chunks.push(bytes);
    byteOffset += bytes.length;
  }

  const xrefOffset = byteOffset;
  const xrefLines = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.map((off) => `${String(off).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ];

  const xrefBytes = encoder.encode(xrefLines.join(''));
  chunks.push(xrefBytes);

  const totalSize = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalSize);
  let writePos = 0;
  for (const chunk of chunks) {
    result.set(chunk, writePos);
    writePos += chunk.length;
  }
  return result;
}

function triggerOfflineDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRecordsAsText(
  steps: SmallStep[],
  triggers: TriggerNote[]
): void {
  const now = new Date();
  const content = buildRecordsText(steps, triggers, now);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerOfflineDownload(
    blob,
    `thuso-small-steps-${formatIsoDateForFilename(now)}.txt`
  );
}

export function exportRecordsAsPdf(
  steps: SmallStep[],
  triggers: TriggerNote[]
): void {
  const now = new Date();
  const bytes = buildRecordsPdfBytes(steps, triggers, now);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: 'application/pdf' });
  triggerOfflineDownload(
    blob,
    `thuso-small-steps-${formatIsoDateForFilename(now)}.pdf`
  );
}
