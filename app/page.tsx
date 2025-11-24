'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  status: 'ACTIVE' | 'CLOSED' | 'STOPPED';
  pnl?: number;
  reason: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  rsi: number;
  macd: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

interface Signal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
}

export default function TradingAgent() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [portfolio, setPortfolio] = useState({
    balance: 10000,
    invested: 0,
    profit: 0,
    winRate: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // Simulate real-time market data
  const generateMarketData = (): MarketData[] => {
    const symbols = ['BTC/USD', 'ETH/USD', 'AAPL', 'TSLA', 'GOOGL'];
    return symbols.map(symbol => {
      const basePrice = symbol.includes('BTC') ? 45000 :
                       symbol.includes('ETH') ? 2500 :
                       symbol === 'AAPL' ? 180 :
                       symbol === 'TSLA' ? 250 : 150;

      const price = basePrice + (Math.random() - 0.5) * (basePrice * 0.05);
      const change = (Math.random() - 0.5) * 10;
      const rsi = 30 + Math.random() * 40;
      const macd = (Math.random() - 0.5) * 2;

      return {
        symbol,
        price,
        change,
        volume: Math.floor(Math.random() * 1000000),
        rsi,
        macd,
        trend: macd > 0 && rsi < 70 ? 'BULLISH' :
               macd < 0 && rsi > 30 ? 'BEARISH' : 'NEUTRAL',
      };
    });
  };

  // AI Trading Agent Logic
  const analyzeMarket = (data: MarketData[]): Signal[] => {
    return data.map(market => {
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0;
      let reason = '';

      // RSI Strategy
      if (market.rsi < 30 && market.trend === 'BULLISH') {
        action = 'BUY';
        confidence = 80 + Math.random() * 15;
        reason = 'Oversold + Bullish trend detected (RSI < 30)';
      } else if (market.rsi > 70 && market.trend === 'BEARISH') {
        action = 'SELL';
        confidence = 75 + Math.random() * 15;
        reason = 'Overbought + Bearish trend detected (RSI > 70)';
      } else if (market.macd > 0.5 && market.change > 2) {
        action = 'BUY';
        confidence = 70 + Math.random() * 20;
        reason = 'Strong MACD signal + Positive momentum';
      } else if (market.macd < -0.5 && market.change < -2) {
        action = 'SELL';
        confidence = 70 + Math.random() * 20;
        reason = 'Weak MACD signal + Negative momentum';
      } else {
        confidence = 50 + Math.random() * 20;
        reason = 'Market conditions unclear - Hold position';
      }

      // Calculate stop loss and take profit
      const stopLossPercent = 0.02; // 2% stop loss
      const takeProfitPercent = 0.06; // 6% take profit (3:1 risk/reward)

      const stopLoss = action === 'BUY'
        ? market.price * (1 - stopLossPercent)
        : market.price * (1 + stopLossPercent);

      const takeProfit = action === 'BUY'
        ? market.price * (1 + takeProfitPercent)
        : market.price * (1 - takeProfitPercent);

      return {
        symbol: market.symbol,
        action,
        confidence,
        reason,
        entryPrice: market.price,
        stopLoss,
        takeProfit,
        riskReward: 3.0,
      };
    });
  };

  // Execute trades based on signals
  const executeTrade = (signal: Signal) => {
    if (signal.action === 'HOLD' || signal.confidence < 70) return;

    const quantity = Math.floor((portfolio.balance * 0.1) / signal.entryPrice); // Use 10% of balance
    if (quantity === 0) return;

    const newTrade: Trade = {
      id: `TRADE-${Date.now()}`,
      symbol: signal.symbol,
      action: signal.action,
      price: signal.entryPrice,
      quantity,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      timestamp: new Date(),
      status: 'ACTIVE',
      reason: signal.reason,
    };

    setTrades(prev => [newTrade, ...prev]);
    setPortfolio(prev => ({
      ...prev,
      invested: prev.invested + (signal.entryPrice * quantity),
    }));
  };

  // Monitor and close trades
  const monitorTrades = () => {
    setTrades(prev => prev.map(trade => {
      if (trade.status !== 'ACTIVE') return trade;

      const currentMarket = marketData.find(m => m.symbol === trade.symbol);
      if (!currentMarket) return trade;

      const currentPrice = currentMarket.price;

      // Check stop loss
      if (trade.action === 'BUY' && currentPrice <= trade.stopLoss) {
        const pnl = (currentPrice - trade.price) * trade.quantity;
        setPortfolio(p => ({
          ...p,
          balance: p.balance + (currentPrice * trade.quantity),
          invested: p.invested - (trade.price * trade.quantity),
          profit: p.profit + pnl,
        }));
        return { ...trade, status: 'STOPPED', pnl };
      }

      if (trade.action === 'SELL' && currentPrice >= trade.stopLoss) {
        const pnl = (trade.price - currentPrice) * trade.quantity;
        setPortfolio(p => ({
          ...p,
          balance: p.balance + (currentPrice * trade.quantity),
          invested: p.invested - (trade.price * trade.quantity),
          profit: p.profit + pnl,
        }));
        return { ...trade, status: 'STOPPED', pnl };
      }

      // Check take profit
      if (trade.action === 'BUY' && currentPrice >= trade.takeProfit) {
        const pnl = (currentPrice - trade.price) * trade.quantity;
        setPortfolio(p => ({
          ...p,
          balance: p.balance + (currentPrice * trade.quantity),
          invested: p.invested - (trade.price * trade.quantity),
          profit: p.profit + pnl,
        }));
        return { ...trade, status: 'CLOSED', pnl };
      }

      if (trade.action === 'SELL' && currentPrice <= trade.takeProfit) {
        const pnl = (trade.price - currentPrice) * trade.quantity;
        setPortfolio(p => ({
          ...p,
          balance: p.balance + (currentPrice * trade.quantity),
          invested: p.invested - (trade.price * trade.quantity),
          profit: p.profit + pnl,
        }));
        return { ...trade, status: 'CLOSED', pnl };
      }

      return trade;
    }));
  };

  // Main trading loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Update market data
      const newMarketData = generateMarketData();
      setMarketData(newMarketData);

      // Analyze and generate signals
      const newSignals = analyzeMarket(newMarketData);
      setSignals(newSignals);

      // Execute high confidence trades
      newSignals.forEach(signal => {
        if (signal.confidence >= 75 && signal.action !== 'HOLD') {
          executeTrade(signal);
        }
      });

      // Monitor existing trades
      monitorTrades();

      // Update price history for chart
      setPriceHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          ...Object.fromEntries(newMarketData.map(m => [m.symbol, m.price])),
        };
        return [...prev.slice(-20), newPoint];
      });

      // Calculate win rate
      const closedTrades = trades.filter(t => t.status === 'CLOSED' || t.status === 'STOPPED');
      const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
      if (closedTrades.length > 0) {
        setPortfolio(p => ({ ...p, winRate: (wins / closedTrades.length) * 100 }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning, marketData, trades]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Activity className="text-green-400" size={40} />
            AI Trading Agent
          </h1>
          <p className="text-slate-400">Autonomous trading decisions with intelligent risk management</p>
        </header>

        {/* Control Panel */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Agent Status</h2>
              <p className="text-slate-400">
                {isRunning ? '🟢 Active - Monitoring markets' : '🔴 Inactive'}
              </p>
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRunning ? 'Stop Agent' : 'Start Agent'}
            </button>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Balance</span>
              <DollarSign className="text-green-400" size={20} />
            </div>
            <p className="text-2xl font-bold">${portfolio.balance.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Invested</span>
              <TrendingUp className="text-blue-400" size={20} />
            </div>
            <p className="text-2xl font-bold">${portfolio.invested.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Profit/Loss</span>
              {portfolio.profit >= 0 ? (
                <TrendingUp className="text-green-400" size={20} />
              ) : (
                <TrendingDown className="text-red-400" size={20} />
              )}
            </div>
            <p className={`text-2xl font-bold ${portfolio.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${portfolio.profit.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Win Rate</span>
              <CheckCircle className="text-purple-400" size={20} />
            </div>
            <p className="text-2xl font-bold">{portfolio.winRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Price Chart */}
        {priceHistory.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Live Market Prices</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                />
                <Legend />
                <Line type="monotone" dataKey="BTC/USD" stroke="#f59e0b" dot={false} />
                <Line type="monotone" dataKey="ETH/USD" stroke="#3b82f6" dot={false} />
                <Line type="monotone" dataKey="AAPL" stroke="#10b981" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Signals */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">AI Signals</h2>
          <div className="space-y-3">
            {signals.length === 0 ? (
              <p className="text-slate-400">Start agent to generate signals...</p>
            ) : (
              signals.map((signal, idx) => (
                <div key={idx} className="bg-slate-700 rounded p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold">{signal.symbol}</span>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        signal.action === 'BUY' ? 'bg-green-600' :
                        signal.action === 'SELL' ? 'bg-red-600' : 'bg-slate-600'
                      }`}>
                        {signal.action}
                      </span>
                      <span className="text-slate-400 text-sm">
                        Confidence: {signal.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{signal.reason}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>Entry: ${signal.entryPrice.toFixed(2)}</span>
                      <span>SL: ${signal.stopLoss.toFixed(2)}</span>
                      <span>TP: ${signal.takeProfit.toFixed(2)}</span>
                      <span>R/R: {signal.riskReward}:1</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Trades */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">Trade History</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {trades.length === 0 ? (
              <p className="text-slate-400">No trades yet...</p>
            ) : (
              trades.map(trade => (
                <div key={trade.id} className="bg-slate-700 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{trade.symbol}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.action === 'BUY' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {trade.action}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.status === 'ACTIVE' ? 'bg-blue-600' :
                        trade.status === 'CLOSED' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {trade.status}
                      </span>
                    </div>
                    {trade.pnl !== undefined && (
                      <span className={`font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${trade.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>{trade.reason}</p>
                    <div className="flex gap-4 text-xs">
                      <span>Qty: {trade.quantity}</span>
                      <span>Entry: ${trade.price.toFixed(2)}</span>
                      <span>SL: ${trade.stopLoss.toFixed(2)}</span>
                      <span>TP: ${trade.takeProfit.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {trade.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
