import React from 'react';
import type { FloatingBurstItem } from '../hooks/useWorkshopSocket';

interface FloatingReactionsProps {
  bursts: FloatingBurstItem[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ bursts }) => {
  if (bursts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-6 flex flex-col items-center animate-float-up opacity-90 transition-all select-none"
          style={{
            left: `${b.leftOffset}%`,
            animation: 'floatUp 3.2s cubic-bezier(0.2, 0.8, 0.3, 1) forwards'
          }}
        >
          <span className="text-4xl sm:text-5xl drop-shadow-md filter transform hover:scale-125 transition-transform">
            {b.emoji}
          </span>
          <span className="mt-1 px-2 py-0.5 text-xs font-semibold bg-gray-900/80 text-white rounded-full backdrop-blur-sm shadow border border-white/20 whitespace-nowrap">
            {b.userName}
          </span>
        </div>
      ))}
    </div>
  );
};
