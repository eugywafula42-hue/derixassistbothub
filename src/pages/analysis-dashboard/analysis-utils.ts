export interface TAnalysisCandle {
    high: number;
    low: number;
    close: number;
    epoch: number;
}

export type TMarketTrend = 'upward' | 'downward' | 'mixed';

export interface TMarketAnalysis {
    latestPrice: number;
    sma20: number;
    sma50: number;
    rsi14: number;
    atr14: number;
    trend: TMarketTrend;
    latestCandleEpoch: number;
    candlesAnalyzed: number;
}

const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const calculateRsi = (closes: number[], period: number): number => {
    let gains = 0;
    let losses = 0;

    for (let index = 1; index <= period; index += 1) {
        const change = closes[index] - closes[index - 1];
        if (change > 0) gains += change;
        if (change < 0) losses += Math.abs(change);
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;
    for (let index = period + 1; index < closes.length; index += 1) {
        const change = closes[index] - closes[index - 1];
        averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
        averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    }

    if (averageGain === 0 && averageLoss === 0) return 50;
    if (averageLoss === 0) return 100;
    if (averageGain === 0) return 0;

    const relativeStrength = averageGain / averageLoss;
    return 100 - 100 / (1 + relativeStrength);
};

/** Calculate descriptive indicators from historical candles; this is not a trade signal. */
export const calculateMarketAnalysis = (input: TAnalysisCandle[]): TMarketAnalysis | null => {
    const candles = input
        .filter(
            candle =>
                Number.isFinite(candle.high) &&
                Number.isFinite(candle.low) &&
                Number.isFinite(candle.close) &&
                Number.isFinite(candle.epoch) &&
                candle.high >= candle.low
        )
        .slice()
        .sort((left, right) => left.epoch - right.epoch);

    if (candles.length < 50) return null;

    const closes = candles.map(candle => candle.close);
    const sma20 = average(closes.slice(-20));
    const sma50 = average(closes.slice(-50));
    const latestPrice = closes[closes.length - 1];
    const trend: TMarketTrend =
        latestPrice > sma20 && sma20 > sma50 ? 'upward' : latestPrice < sma20 && sma20 < sma50 ? 'downward' : 'mixed';

    const rangeStart = candles.length - 14;
    const trueRanges: number[] = [];
    for (let index = rangeStart; index < candles.length; index += 1) {
        const candle = candles[index];
        const previousClose = candles[index - 1].close;
        trueRanges.push(
            Math.max(
                candle.high - candle.low,
                Math.abs(candle.high - previousClose),
                Math.abs(candle.low - previousClose)
            )
        );
    }

    return {
        latestPrice,
        sma20,
        sma50,
        rsi14: calculateRsi(closes, 14),
        atr14: average(trueRanges),
        trend,
        latestCandleEpoch: candles[candles.length - 1].epoch,
        candlesAnalyzed: candles.length,
    };
};
