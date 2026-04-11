import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

interface GaugeProps {
  value: number;
}

const Gauge: React.FC<GaugeProps> = ({ value }) => {
  const data = [
    { name: 'Extreme Fear', value: 25, color: '#dc2626' },
    { name: 'Fear', value: 20, color: '#f97316' },
    { name: 'Neutral', value: 10, color: '#eab308' },
    { name: 'Greed', value: 20, color: '#22c55e' },
    { name: 'Extreme Greed', value: 25, color: '#15803d' },
  ];

  const needleAngle = (value / 100) * 180 - 90;

  return (
    <div className="relative w-full h-72 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={120}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Needle */}
      <motion.div
        className="absolute bottom-[30%] left-1/2 w-1.5 h-28 bg-slate-900 origin-bottom rounded-full shadow-sm"
        initial={{ rotate: -90 }}
        animate={{ rotate: needleAngle }}
        transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        style={{ transform: 'translateX(-50%)' }}
      />
      
      {/* Center Point */}
      <div className="absolute bottom-[30%] left-1/2 w-4 h-4 bg-slate-900 rounded-full -translate-x-1/2 translate-y-1/2 z-10 border-2 border-white shadow-md" />
      
      {/* Value Display */}
      <div className="absolute bottom-2 flex flex-col items-center">
        <span className="text-5xl font-bold tracking-tighter">{value}</span>
        <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Index</span>
      </div>
    </div>
  );
};

export default Gauge;
