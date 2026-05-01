import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, TrendingUp, TrendingDown, ShieldAlert, Activity, BarChart3, Zap, Layers, Scale, LineChart as LineChartIcon, Gauge as GaugeIcon } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getKospiMarketData, MarketData } from './services/api';
import Gauge from './components/Gauge';
import IndicatorCard from './components/IndicatorCard';
import { cn, getSentimentColor, getSentimentLabel } from './lib/utils';

const App: React.FC = () => {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gauge' | 'chart'>('gauge');
  const [chartPeriod, setChartPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

  const getMarketCloseTime = () => {
    const now = new Date();
    // Nextrade ATS close is 20:00 KST (11:00 UTC)
    const closeTime = new Date(now);
    closeTime.setUTCHours(11, 0, 0, 0);

    // If it's weekend, the last close was Friday
    const day = now.getUTCDay(); // 0: Sun, 6: Sat
    if (day === 0) { // Sunday
      closeTime.setUTCDate(now.getUTCDate() - 2);
    } else if (day === 6) { // Saturday
      closeTime.setUTCDate(now.getUTCDate() - 1);
    } else if (now < closeTime) {
      // If it's before 20:00 KST today, the last close was yesterday
      closeTime.setUTCDate(now.getUTCDate() - 1);
      // Re-check weekend if yesterday was Sunday
      if (closeTime.getUTCDay() === 0) {
        closeTime.setUTCDate(closeTime.getUTCDate() - 2);
      }
    }
    return closeTime;
  };

  const formatMarketCloseTime = (date: Date) => {
    // Convert UTC to KST for display (+9 hours)
    const kstTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const month = kstTime.getUTCMonth() + 1;
    const day = kstTime.getUTCDate();
    const hours = kstTime.getUTCHours().toString().padStart(2, '0');
    const minutes = kstTime.getUTCMinutes().toString().padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${minutes} 넥스트레이드 장 마감 기준 반영 완료`;
  };

  const fetchData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const marketClose = getMarketCloseTime();
      const cached = localStorage.getItem('kospi_fear_greed_data_v14');
      
      if (!force && cached) {
        const parsed = JSON.parse(cached);
        const cachedTime = new Date(parsed.targetCloseTime);
        
        // If the cached target close time matches the current target close time, use cache
        if (cachedTime.getTime() === marketClose.getTime()) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      }

      const result = await getKospiMarketData();
      setData(result);
      
      // Save to cache with the target close time
      localStorage.setItem('kospi_fear_greed_data_v14', JSON.stringify({
        targetCloseTime: marketClose.toISOString(),
        data: result
      }));
    } catch (err) {
      console.error(err);
      setError('데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredChartData = () => {
    if (!data?.chartData) return [];
    const days = chartPeriod === '1M' ? 20 : chartPeriod === '3M' ? 60 : chartPeriod === '6M' ? 120 : 250;
    return data.chartData.slice(-days);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">KOSPI Fear & Greed Index</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market Sentiment Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {loading && !data ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-medium text-slate-500 animate-pulse">시장 데이터를 분석하고 있습니다...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">오류 발생</h2>
              <p className="text-slate-500 max-w-md mb-6">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                다시 시도하기
              </button>
            </motion.div>
          ) : data ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Market Summary Cards */}
              <section className="grid grid-cols-1 md:grid-cols-1 gap-6">
                {[
                  { title: 'KOSPI', data: data.marketSummary?.kospi, format: (v: number) => (v || 0).toFixed(2) }
                ].map((item, i) => {
                  const val = item.data?.value || 0;
                  const change = item.data?.change || 0;
                  const changePercent = item.data?.changePercent || 0;
                  
                  return (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{item.title}</h3>
                      <div className="flex items-end justify-between">
                        <span className="text-3xl font-black text-slate-900">{item.format(val)}</span>
                        <div className={cn("flex items-center text-sm font-bold", change >= 0 ? "text-red-500" : "text-blue-500")}>
                          {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                          <span>{change > 0 ? '+' : ''}{item.format(change)} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Main Gauge Section */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="lg:col-span-5 flex flex-col items-center text-center w-full">
                  <div className="flex items-center justify-center gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit mx-auto">
                    <button 
                      onClick={() => setViewMode('gauge')} 
                      className={cn("flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-md transition-colors", viewMode === 'gauge' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      <GaugeIcon className="w-4 h-4" />
                      게이지
                    </button>
                    <button 
                      onClick={() => setViewMode('chart')} 
                      className={cn("flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-md transition-colors", viewMode === 'chart' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      <LineChartIcon className="w-4 h-4" />
                      추이
                    </button>
                  </div>

                  {viewMode === 'gauge' ? (
                    <motion.div
                      key="gauge"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center w-full"
                    >
                      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Current Sentiment</h2>
                      <div className={cn("text-4xl font-black mb-6", getSentimentColor(data.indexValue))}>
                        {getSentimentLabel(data.indexValue)}
                      </div>
                      <Gauge value={data.indexValue} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chart"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full h-[280px] flex flex-col items-center"
                    >
                      <div className="flex justify-between items-center w-full mb-2 px-2">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trend ({chartPeriod})</h2>
                        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md">
                          {(['1M', '3M', '6M', '1Y'] as const).map(p => (
                            <button
                              key={p}
                              onClick={() => setChartPeriod(p)}
                              className={cn("px-2 py-1 text-[10px] font-bold rounded-sm transition-colors", chartPeriod === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="w-full flex-1 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getFilteredChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b' }} 
                              dy={10} 
                              minTickGap={20}
                              tickFormatter={(val) => {
                                const parts = val.split('-');
                                if (parts.length === 3) {
                                  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                                }
                                return val;
                              }}
                            />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                              formatter={(value: number) => [value, 'F&G Index']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  )}

                  <p className="mt-6 text-xs text-slate-400 font-medium italic">
                    {formatMarketCloseTime(getMarketCloseTime())}
                  </p>
                </div>
                
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">시장 요약</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {data.sentiment}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <Info className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">주요 동향</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">현재 KOSPI 시장은 {data.indexValue > 0 ? '낙관적인' : '신중한'} 흐름을 보이고 있습니다.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">변동성 지수</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">VKOSPI 지표가 {data.indicators.volatility.status} 상태로 분석됩니다.</p>
                    </div>
                  </div>
                  
                  {/* Historical Data Row */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">과거 지수 추이</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: '1일 전', value: data.historical.oneDayAgo },
                        { label: '1주일 전', value: data.historical.oneWeekAgo },
                        { label: '3개월 전', value: data.historical.threeMonthsAgo },
                        { label: '1년 전', value: data.historical.oneYearAgo },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 mb-1">{item.label}</span>
                          <span className={cn("text-xl font-black", getSentimentColor(item.value))}>{item.value}</span>
                          <span className={cn("text-[10px] font-bold mt-0.5", getSentimentColor(item.value))}>{getSentimentLabel(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* KOSPI Chart Section */}
              <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center w-full mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    KOSPI 시세 추이 ({chartPeriod})
                  </h2>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['1M', '3M', '6M', '1Y'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={cn("px-4 py-1.5 text-sm font-bold rounded-md transition-colors", chartPeriod === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getFilteredChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        dy={10} 
                        minTickGap={30}
                        tickFormatter={(val) => {
                          const parts = val.split('-');
                          if (parts.length === 3) {
                            return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
                          }
                          return val;
                        }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        tickFormatter={(val) => val.toLocaleString()}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                        formatter={(value: number) => [value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'KOSPI']}
                        isAnimationActive={false}
                      />
                      <Line type="monotone" dataKey="kospiClose" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Indicators Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                    8대 시장 지표
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <IndicatorCard
                    title="주가 모멘텀"
                    value={data.indicators.momentum.value}
                    label={data.indicators.momentum.label}
                    status={data.indicators.momentum.status}
                    description="KOSPI 지수가 125일 이동평균선보다 얼마나 위에 있는지를 측정합니다. 지수가 이평선보다 크게 높으면 탐욕, 반대로 낮으면 공포로 해석하며 시장의 추세적 강도를 나타냅니다."
                    delay={0.1}
                  />
                  <IndicatorCard
                    title="주가 강도"
                    value={data.indicators.strength.value}
                    label={data.indicators.strength.label}
                    status={data.indicators.strength.status}
                    description="지난 52주 동안의 최고가와 최저가 범위 내에서 현재 주가의 위치를 파악합니다. 최고가에 근접할수록 강한 매수세(탐욕)를, 최저가에 근접할수록 투매(공포)를 의미합니다."
                    delay={0.2}
                  />
                  <IndicatorCard
                    title="거래량 폭"
                    value={data.indicators.breadth.value}
                    label={data.indicators.breadth.label}
                    status={data.indicators.breadth.status}
                    description="최근 20일간의 거래량이 지난 120일 평균 대비 얼마나 늘었는지 분석합니다. 하락장에서 거래량이 폭증하면 공포의 정점(바닥)을, 상승장에서의 폭증은 과열된 탐욕을 시사합니다."
                    delay={0.3}
                  />
                  <IndicatorCard
                    title="시장 변동성"
                    value={data.indicators.volatility.value}
                    label={data.indicators.volatility.label}
                    status={data.indicators.volatility.status}
                    description="KOSPI의 최근 30일 변동성을 120일 평균과 비교합니다. 변동성이 급증하는 것은 시장의 불안감과 공포가 커지고 있음을 나타내는 대표적인 지표입니다."
                    delay={0.4}
                  />
                  <IndicatorCard
                    title="단기 옵션 심리"
                    value={data.indicators.options.value}
                    label={data.indicators.options.label}
                    status={data.indicators.options.status}
                    description="최근 5일간의 단기 주가 흐름을 분석하여 투자자들의 투기적 성향을 파악합니다. 단기 급등은 공격적 탐욕을, 급락은 방어적 공포를 반영합니다."
                    delay={0.5}
                  />
                  <IndicatorCard
                    title="안전 자산 수요"
                    value={data.indicators.safeHaven.value}
                    label={data.indicators.safeHaven.label}
                    status={data.indicators.safeHaven.status}
                    description="글로벌 대표 지수인 S&P 500의 추세를 통해 투자자들의 위험 선호도를 측정합니다. 안전 자산으로 자금이 쏠리면 주식 시장은 공포 국면에 진입한 것으로 봅니다."
                    delay={0.6}
                  />
                  <IndicatorCard
                    title="외국인 투자 심리"
                    value={data.indicators.foreign.value}
                    label={data.indicators.foreign.label}
                    status={data.indicators.foreign.status}
                    description="KOSPI와 S&P 500의 상대적 성과를 비교합니다. KOSPI가 글로벌 시장 대비 유독 약세라면 외국인 투자자들이 한국 시장을 기피하고 있다는 공포 신호로 해석합니다."
                    delay={0.7}
                  />
                </div>
              </section>

              {/* Educational Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-indigo-900 text-white rounded-3xl p-8 shadow-xl shadow-indigo-200">
                  <Zap className="w-10 h-10 mb-4 text-indigo-300" />
                  <h3 className="text-xl font-bold mb-4">Fear & Greed Index란?</h3>
                  <p className="text-indigo-100 leading-relaxed mb-4">
                    공포와 탐욕 지수는 시장의 전반적인 심리 상태를 하나의 바늘(0~100)로 요약해 보여주는 지표입니다. 
                    워렌 버핏의 "남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워져라"는 격언처럼, 
                    시장이 과도한 공포에 빠졌을 때는 매수 기회를, 극도의 탐욕 상태일 때는 리스크 관리를 고려할 수 있습니다.
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold mt-6 bg-indigo-950/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-red-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                      0-25: 극도의 공포
                    </div>
                    <div className="flex items-center gap-2 text-orange-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                      26-45: 공포
                    </div>
                    <div className="flex items-center gap-2 text-yellow-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                      46-55: 중립
                    </div>
                    <div className="flex items-center gap-2 text-green-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      56-75: 탐욕
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-700 shadow-[0_0_8px_rgba(21,128,61,0.6)]" />
                      76-100: 극도의 탐욕
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <Layers className="w-10 h-10 mb-4 text-indigo-600" />
                  <h3 className="text-xl font-bold mb-4 text-slate-900">데이터 산출 방식</h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    본 서비스는 Yahoo Finance API의 실제 시장 데이터를 바탕으로 KOSPI 시장의 7가지 핵심 지표를 분석합니다. 
                    CNN Fear and Greed Index의 레이아웃 및 데이터 산출 방식을 전체적으로 참고하여 만들어졌으며,
                    각 세부 지표는 <strong>실제 수치(Raw Data)</strong>와 그에 따른 <strong>상태(공포, 탐욕 등)</strong>를 직관적으로 제공하며, 
                    이 7가지 지표의 상태를 종합적으로 가중 평균하여 메인 게이지의 최종 인덱스(-100~100)를 산출합니다.
                    Google AI Studio 내에서 TypeScript를 사용하여 구축되었습니다. 
                  </p>
                  <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                    <Scale className="w-4 h-4" />
                    한국 시장 특화(외국인 수급, 글로벌 상대 성과 등) 프레임워크 적용
                  </div>
                </div>
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-200 rounded-md flex items-center justify-center">
              <TrendingUp className="text-slate-500 w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">KOSPI Fear & Greed Index</span>
          </div>
          <p className="text-xs text-slate-400 text-center md:text-right max-w-md">
            본 지표는 투자 참고용이며, 실제 투자 결과에 대한 책임을 지지 않습니다. 
            시장의 심리 상태를 이해하기 위한 보조 지표로 활용하시기 바랍니다.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
