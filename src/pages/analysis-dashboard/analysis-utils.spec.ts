import { calculateMarketAnalysis } from './analysis-utils';
import type { TAnalysisCandle } from './analysis-utils';

const candlesFromCloses = (closes: number[]): TAnalysisCandle[] =>
    closes.map((close, index) => ({
        high: close + 2,
        low: close - 2,
        close,
        epoch: index,
    }));

describe('calculateMarketAnalysis', () => {
    it('returns trend, moving averages, RSI, and range from rising candles', () => {
        const candles = candlesFromCloses(Array.from({ length: 60 }, (_, index) => 100 + index));
        const result = calculateMarketAnalysis(candles);

        expect(result).not.toBeNull();
        expect(result?.trend).toBe('upward');
        expect(result?.sma20).toBeCloseTo(149.5);
        expect(result?.sma50).toBeCloseTo(134.5);
        expect(result?.rsi14).toBe(100);
        expect(result?.atr14).toBe(4);
        expect(result?.candlesAnalyzed).toBe(60);
    });

    it('treats a flat series as mixed with neutral RSI', () => {
        const result = calculateMarketAnalysis(candlesFromCloses(Array.from({ length: 50 }, () => 100)));

        expect(result?.trend).toBe('mixed');
        expect(result?.rsi14).toBe(50);
        expect(result?.atr14).toBe(2);
    });

    it('returns null until at least 50 valid candles are available', () => {
        expect(calculateMarketAnalysis(candlesFromCloses(Array.from({ length: 49 }, (_, index) => 100 + index)))).toBe(
            null
        );
    });
});
