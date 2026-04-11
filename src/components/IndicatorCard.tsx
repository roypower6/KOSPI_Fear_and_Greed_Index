import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Info, X } from 'lucide-react';

interface IndicatorCardProps {
  title: string;
  value: string;
  label: string;
  status: string;
  description: string;
  delay?: number;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ title, value, label, status, description, delay = 0 }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusColor = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes('fear')) return 'text-red-600';
    if (lower.includes('greed')) return 'text-green-600';
    return 'text-yellow-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        <button 
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-slate-300 hover:text-indigo-500 transition-colors z-20 relative"
          aria-label="지표 정보 보기"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mb-4">
        <span className={cn("text-2xl font-black tracking-tight", getStatusColor(status))}>
          {status}
        </span>
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-lg font-bold text-slate-900">{value}</span>
        </div>
      </div>

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-indigo-900/95 p-6 flex flex-col justify-center text-white z-30"
          >
            <button 
              onClick={() => setShowTooltip(false)}
              className="absolute top-4 right-4 text-indigo-300 hover:text-white z-40"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-2">{title} 상세 설명</h4>
            <p className="text-sm leading-relaxed font-medium">
              {description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default IndicatorCard;
