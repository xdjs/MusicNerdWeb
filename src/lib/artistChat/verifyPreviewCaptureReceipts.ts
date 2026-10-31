/** Verify this experiment's receipt sequence; this is not invoice verification. */
export function verifyPreviewCaptureReceipts(receipts: Record<string, unknown>[]): boolean {
    if (!receipts.length || receipts.length > 200) return false;
    const id = receipts[0].requestId;
    if (typeof id !== 'string' || !id) return false;
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-10;
    const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
    const whole = (x: unknown): x is number => num(x) && Number.isSafeInteger(x);
    let held = 0, observed = 0, pending = 0, steps = 0, reconciled = 0, tools = 0, done = false;
    const reservations = new Map<number, number>(), usage = new Map<number, number>();
    const generations = new Map<number, unknown>(), settled = new Set<number>(), settledIds = new Set<unknown>();
    for (const e of receipts) {
        const r = e.reservedUsd, o = e.observedUpperEstimateUsd;
        if (done || e.version !== 2 || e.requestId !== id || e.estimateOnly !== true || e.limitUsd !== .15 || !num(r) || !num(o) || r > .15 || o > r) return false;
        if (e.phase === 'reserved') {
            if (pending || e.step !== steps + 1 || steps >= 6 || !whole(e.preparedBytes) || !whole(e.outputTokens) || e.outputTokens < 1 || e.outputTokens > 1024 || e.inputTokenEstimate !== e.preparedBytes + 2048) return false;
            const cost = ((e.preparedBytes + 2048) * 4400 + e.outputTokens * 11000) / 1e9;
            if (!near(r, held + cost) || !near(o, observed)) return false;
            pending = ++steps; reservations.set(pending, cost);
        } else if (e.phase === 'reconciled') {
            if (!pending || e.step !== pending || !whole(e.inputTokens) || !whole(e.outputTokens) || !['stop','tool-calls'].includes(String(e.finishReason)) || e.accounting !== 'reservation_retained' || e.settlementUsd !== null) return false;
            const cost = (e.inputTokens * 4400 + e.outputTokens * 11000) / 1e9;
            if (!near(r, held) || !near(o, observed + cost) || cost > reservations.get(pending)!) return false;
            usage.set(pending,cost); generations.set(pending,e.generationId); pending = 0; reconciled++;
        } else if (e.phase === 'settled') {
            if (pending || !whole(e.step) || !usage.has(e.step) || settled.has(e.step) || typeof e.generationId !== 'string' || !e.generationId || generations.get(e.step) !== e.generationId || settledIds.has(e.generationId) || !num(e.settlementUsd) || !num(e.reportedTotalUsd) || !num(e.reportedSurchargeUsd)) return false;
            const cost = Math.max(Math.ceil(e.reportedTotalUsd * 1e9), Math.round(usage.get(e.step)! * 1e9) + Math.ceil(e.reportedSurchargeUsd * 1e9)) / 1e9;
            if (!near(cost,e.settlementUsd) || cost > reservations.get(e.step)! || !near(r, held - reservations.get(e.step)! + cost) || !near(o,observed)) return false;
            settled.add(e.step); settledIds.add(e.generationId);
        } else if (e.phase === 'accounting_checked') {
            if (pending || !settled.size || !num(e.elapsedMs) || e.elapsedMs > 2100 || !near(r,held) || !near(o,observed)) return false;
        } else if (e.phase === 'tool') {
            if (e.sequence !== ++tools || tools > 48 || !['searchSources','readSource','selectPassage','unknown'].includes(String(e.tool)) || !['called','returned','error'].includes(String(e.stage)) || !near(r,held) || !near(o,observed)) return false;
        } else if (e.phase === 'complete') {
            if (pending || !steps || e.attempts !== steps || e.reconciled !== reconciled || steps !== reconciled || !near(r,held) || !near(o,observed)) return false;
            done = true;
        } else return false;
        held = r; observed = o;
    }
    return done;
}
