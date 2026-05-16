const TOLERANCE = 0.01;

export function emptyLine() {
  return { method: 'CASH', amount: '', mpesaReference: '' };
}

export function defaultLinesForTotal(total) {
  const half = total / 2;
  return [
    { method: 'CASH', amount: String(half), mpesaReference: '' },
    { method: 'MPESA', amount: String(total - half), mpesaReference: '' },
  ];
}

export function sumLines(lines) {
  return (lines || []).reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
}

export function validateLines(lines, saleTotal) {
  const total = Number(saleTotal) || 0;
  const sum = sumLines(lines);
  if (Math.abs(sum - total) > TOLERANCE) {
    return { ok: false, message: `Lines must sum to KES ${total.toFixed(2)} (currently ${sum.toFixed(2)})` };
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const amt = parseFloat(line.amount);
    if (!amt || amt <= 0) {
      return { ok: false, message: `Line ${i + 1}: enter a valid amount` };
    }
    if (line.method === 'MPESA' && !String(line.mpesaReference || '').trim()) {
      return { ok: false, message: `Line ${i + 1}: M-Pesa reference required` };
    }
  }
  return { ok: true };
}

export function buildSplitPayload(saleId, lines) {
  return {
    saleId,
    lines: lines.map((l) => ({
      method: l.method,
      amount: parseFloat(l.amount),
      mpesaReference: l.method === 'MPESA' ? String(l.mpesaReference).trim() : undefined,
    })),
  };
}
