import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import mockData from '../../lib/mock-trading-data';

interface NAVChartProps {
  bundleId: number;
  height?: number;
  showVolume?: boolean;
  chartType?: 'line' | 'area';
}

type Period = '24h' | '7d' | '30d' | '1y';

export const NAVChart: React.FC<NAVChartProps> = ({
  bundleId,
  height = 400,
  showVolume = false,
  chartType = 'area',
}) => {
  const [period, setPeriod] = useState<Period>('24h');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredValue, setHoveredValue] = useState<any>(null);

  // Fetch NAV history data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await mockData.helpers.delay(500);
      const history = mockData.navHistory(bundleId, period);
      setData(history);
      setLoading(false);
    };

    fetchData();
  }, [bundleId, period]);

  // Get bundle info
  const bundle = mockData.bundles.find(b => b.id === bundleId);
  if (!bundle) return <div>Bundle not found</div>;

  // Calculate price change
  const calculatePriceChange = () => {
    if (data.length < 2) return { value: 0, percentage: 0 };
    const first = data[0].nav_per_token;
    const last = data[data.length - 1].nav_per_token;
    const change = last - first;
    const percentage = (change / first) * 100;
    return { value: change, percentage };
  };

  const priceChange = calculatePriceChange();
  const isPositive = priceChange.value >= 0;

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (period === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (period === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    } else if (period === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-3 shadow-xl">
          <div className="text-xs text-gray-400 mb-1">{formatTimestamp(label)}</div>
          <div className="text-sm font-mono text-white">
            NAV: {mockData.helpers.formatCurrency(BigInt(payload[0].value), 8)}
          </div>
          {showVolume && payload[1] && (
            <div className="text-xs font-mono text-gray-400 mt-1">
              Vol: {mockData.helpers.formatCompact(BigInt(payload[1].value))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Period selector buttons
  const PeriodSelector = () => (
    <div className="flex gap-1">
      {(['24h', '7d', '30d', '1y'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
            period === p
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );

  // Chart controls
  const ChartControls = () => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-white font-mono">
            {mockData.helpers.formatCurrency(BigInt(bundle.nav_per_token), 8)}
          </span>
          <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'} {mockData.helpers.formatCurrency(BigInt(Math.abs(priceChange.value)), 8)}
            {' '}({mockData.helpers.formatPercentage(priceChange.percentage)})
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          NAV per token • {period} change
        </div>
      </div>
      <PeriodSelector />
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className={`bg-gray-800 rounded`} style={{ height }}></div>
      </div>
    );
  }

  // Chart gradient
  const gradientId = `navGradient-${bundleId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <ChartControls />

      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <ResponsiveContainer width="100%" height={height}>
          {chartType === 'area' ? (
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseLeave={() => setHoveredValue(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
                tickFormatter={(value) => `$${(value / 1e8).toFixed(2)}`}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="nav_per_token"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                onMouseEnter={(data) => setHoveredValue(data)}
              />
              {/* Reference line for starting value */}
              <ReferenceLine
                y={data[0]?.nav_per_token}
                stroke="#6b7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
                tickFormatter={(value) => `$${(value / 1e8).toFixed(2)}`}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={{ stroke: '#374151' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="nav_per_token"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <ReferenceLine
                y={data[0]?.nav_per_token}
                stroke="#6b7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </LineChart>
          )}
        </ResponsiveContainer>

        {/* Additional stats */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-800">
          <div>
            <div className="text-xs text-gray-500">Market Cap</div>
            <div className="text-sm font-mono text-white">
              {mockData.helpers.formatCompact(bundle.total_nav_usd)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">24h Volume</div>
            <div className="text-sm font-mono text-white">
              {mockData.helpers.formatCompact(bundle.volume_24h)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Tokens</div>
            <div className="text-sm font-mono text-white">
              {(Number(bundle.total_tokens) / 1e8).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Holders</div>
            <div className="text-sm font-mono text-white">
              {bundle.holder_count.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NAVChart;