import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const generateMockTVLData = () => {
  const now = new Date('2025-10-03T06:00:00Z').getTime();
  const hoursBack = 168;
  const data = [];

  let baseValue = 0;

  for (let i = hoursBack; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000);
    const date = new Date(timestamp);

    const hoursElapsed = hoursBack - i;
    const daysElapsed = hoursElapsed / 24;

    if (daysElapsed < 4) {
      const slowGrowth = hoursElapsed * 0.8;
      const smallVolatility = (Math.random() - 0.5) * 5;
      baseValue = Math.max(0, slowGrowth + smallVolatility);
    } else {
      const baseFromDay4 = 4 * 24 * 0.8;
      const hoursInGrowthPeriod = hoursElapsed - (4 * 24);
      const steadyGrowth = baseFromDay4 + (hoursInGrowthPeriod * 15);
      const moderateVolatility = (Math.random() - 0.5) * 30;
      baseValue = Math.max(baseFromDay4, steadyGrowth + moderateVolatility);
    }

    baseValue = Math.min(2000, baseValue);

    data.push({
      timestamp,
      date: date.toISOString(),
      value: Math.round(baseValue),
      formattedDate: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  }

  return data;
};

const formatValue = (value: number) => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black border border-white/20 rounded-lg p-3 shadow-xl">
        <div className="text-sm text-gray-400 mb-1">{data.formattedDate}</div>
        <div className="text-lg font-bold text-white">{formatValue(data.value)}</div>
      </div>
    );
  }
  return null;
};

export default function TVLHero() {
  const [tvlData, setTvlData] = useState<any[]>([]);
  const [currentTVL, setCurrentTVL] = useState(0);
  const [change24h, setChange24h] = useState(0);

  useEffect(() => {
    const data = generateMockTVLData();
    setTvlData(data);

    if (data.length > 0) {
      const latest = data[data.length - 1].value;
      setCurrentTVL(latest);

      // Calculate 24h change
      const oneDayAgo = data[data.length - 24]?.value || data[0].value;
      const percentChange = ((latest - oneDayAgo) / oneDayAgo) * 100;
      setChange24h(percentChange);
    }
  }, []);

  return (
    <section className="relative h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black opacity-90" />

      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-8 pt-24 lg:pt-20">
        <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-sm font-mono text-gray-400">TVL in XFusion</div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-xs font-mono text-white">
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">
                {formatValue(currentTVL)}
              </h1>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 border border-white/20 rounded-full flex items-center justify-center"
              >
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="w-full flex-1 max-h-[50vh] relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none z-10" />

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={tvlData}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="timestamp"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(timestamp) => {
                    const date = new Date(timestamp);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  stroke="#ffffff"
                  strokeOpacity={0.1}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={50}
                />

                <YAxis
                  domain={[0, 'dataMax + 100']}
                  tickFormatter={formatValue}
                  stroke="#ffffff"
                  strokeOpacity={0.1}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                  fill="#ffffff"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
