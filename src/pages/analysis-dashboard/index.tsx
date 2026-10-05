import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { calculateMarketAnalysis } from './analysis-utils';
import type { TAnalysisCandle, TMarketAnalysis } from './analysis-utils';
import './analysis-dashboard.scss';

type TAnalysisGranularity = 60 | 300 | 900 | 3600;

const ANALYSIS_INTERVALS: { label: string; value: TAnalysisGranularity }[] = [
    { label: localize('1 minute'), value: 60 },
    { label: localize('5 minutes'), value: 300 },
    { label: localize('15 minutes'), value: 900 },
    { label: localize('1 hour'), value: 3600 },
];

const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 5 }).format(value);

const MarketAnalysisDashboard = observer(() => {
    const { chart_store, dashboard, quick_strategy } = useStore();
    const { chartData, getQuotes } = useSmartChartAdaptor();
    const [symbol, setSymbol] = useState(chart_store.symbol ?? '');
    const [granularity, setGranularity] = useState<TAnalysisGranularity>(60);
    const [analysis, setAnalysis] = useState<TMarketAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [error, setError] = useState('');

    const symbols = useMemo(
        () =>
            chartData.activeSymbols
                .filter(item => Boolean(item.symbol))
                .map(item => ({ value: item.symbol, label: item.display_name || item.symbol }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        [chartData.activeSymbols]
    );

    useEffect(() => {
        if (symbols.length === 0 || symbols.some(item => item.value === symbol)) return;
        const chartSymbol = symbols.find(item => item.value === chart_store.symbol)?.value;
        setSymbol(chartSymbol ?? symbols[0].value);
    }, [chart_store.symbol, symbol, symbols]);

    const clearAnalysis = () => {
        setAnalysis(null);
        setError('');
        setHasAnalyzed(false);
    };

    const handleAnalyze = useCallback(async () => {
        if (!symbol) return;
        setIsLoading(true);
        setHasAnalyzed(true);
        setAnalysis(null);
        setError('');

        try {
            const response = await getQuotes({ symbol, granularity, count: 100 });
            const rawCandles =
                (response as unknown as {
                    candles?: { high?: number; low?: number; close?: number; epoch?: number }[];
                }).candles ?? [];
            const candles: TAnalysisCandle[] = rawCandles.map(candle => ({
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
                epoch: Number(candle.epoch),
            }));
            const result = calculateMarketAnalysis(candles);

            if (!result) {
                setError(localize('Not enough valid candle history for these indicators. Try another market or interval.'));
                return;
            }
            setAnalysis(result);
        } catch {
            setError(localize('Market history could not be loaded. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    }, [getQuotes, granularity, symbol]);

    const openFreeBot = () => {
        dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);
        quick_strategy.setFormVisibility(true);
    };

    const trendLabel = analysis?.trend === 'upward'
        ? localize('Upward')
        : analysis?.trend === 'downward'
          ? localize('Downward')
          : localize('Mixed');
    const rsiBand =
        analysis && analysis.rsi14 >= 70
            ? localize('Above 70')
            : analysis && analysis.rsi14 <= 30
              ? localize('Below 30')
              : localize('Between 30 and 70');

    return (
        <section className='market-analysis' aria-labelledby='market-analysis-title'>
            <header className='market-analysis__header'>
                <div>
                    <p className='market-analysis__eyebrow'>{localize('Free market tools')}</p>
                    <h1 id='market-analysis-title'>{localize('Market analysis')}</h1>
                    <p className='market-analysis__description'>
                        {localize('Review recent market history with simple, transparent technical indicators.')}
                    </p>
                </div>
                <button className='market-analysis__secondary-button' type='button' onClick={openFreeBot}>
                    {localize('Build a free bot')}
                </button>
            </header>

            <section className='market-analysis__panel' aria-label={localize('Analysis settings')}>
                <label className='market-analysis__field'>
                    <span>{localize('Market')}</span>
                    <select
                        value={symbol}
                        onChange={event => {
                            setSymbol(event.currentTarget.value);
                            clearAnalysis();
                        }}
                        disabled={symbols.length === 0 || isLoading}
                    >
                        {symbols.map(item => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className='market-analysis__field'>
                    <span>{localize('Candle interval')}</span>
                    <select
                        value={granularity}
                        onChange={event => {
                            setGranularity(Number(event.currentTarget.value) as TAnalysisGranularity);
                            clearAnalysis();
                        }}
                        disabled={isLoading}
                    >
                        {ANALYSIS_INTERVALS.map(interval => (
                            <option key={interval.value} value={interval.value}>
                                {interval.label}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    className='market-analysis__primary-button'
                    type='button'
                    onClick={handleAnalyze}
                    disabled={!symbol || isLoading}
                >
                    {isLoading ? localize('Analyzing…') : localize('Analyze market')}
                </button>
            </section>

            <p className='market-analysis__notice' role='note'>
                {localize(
                    'Read-only market history. These indicators describe past price movement; they are not a forecast or a trade recommendation, and this page never places trades.'
                )}
            </p>

            {isLoading && (
                <p className='market-analysis__status' role='status'>
                    {localize('Loading candle history…')}
                </p>
            )}
            {error && (
                <p className='market-analysis__error' role='alert'>
                    {error}
                </p>
            )}
            {!isLoading && !error && !analysis && (
                <p className='market-analysis__empty'>
                    {symbols.length === 0
                        ? localize('Market list is loading. Please wait a moment.')
                        : hasAnalyzed
                          ? localize('No analysis is available yet.')
                          : localize('Choose a market and interval, then analyze recent candles.')}
                </p>
            )}

            {analysis && (
                <>
                    <section className='market-analysis__metric-grid' aria-label={localize('Indicator results')}>
                        <article className='market-analysis__metric'>
                            <span>{localize('Latest price')}</span>
                            <strong>{formatNumber(analysis.latestPrice)}</strong>
                            <small>{symbol}</small>
                        </article>
                        <article className='market-analysis__metric'>
                            <span>{localize('Trend context')}</span>
                            <strong>{trendLabel}</strong>
                            <small>{localize('SMA 20')}: {formatNumber(analysis.sma20)} · {localize('SMA 50')}: {formatNumber(analysis.sma50)}</small>
                        </article>
                        <article className='market-analysis__metric'>
                            <span>{localize('RSI (14)')}</span>
                            <strong>{formatNumber(analysis.rsi14)}</strong>
                            <small>{rsiBand}</small>
                        </article>
                        <article className='market-analysis__metric'>
                            <span>{localize('ATR (14)')}</span>
                            <strong>{formatNumber(analysis.atr14)}</strong>
                            <small>{localize('Average candle range')}</small>
                        </article>
                    </section>
                    <p className='market-analysis__freshness'>
                        {localize('Based on')} {analysis.candlesAnalyzed} {localize('candles. Latest candle')}: {new Date(analysis.latestCandleEpoch * 1000).toLocaleString()}
                    </p>
                </>
            )}

            <p className='market-analysis__footer'>
                {localize(
                    'For practice, select a demo account before running a bot. Review the bot settings yourself; nothing starts from this analysis page.'
                )}
            </p>
        </section>
    );
});

export default MarketAnalysisDashboard;
