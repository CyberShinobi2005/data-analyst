import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtext: string;
  badgeText?: string;
  accentColor: 'yellow' | 'coral' | 'emerald' | 'indigo' | 'purple' | 'cyan';
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  badgeText,
  accentColor,
  icon,
}) => {
  const colorMap = {
    yellow: 'bg-nb-yellow text-black border-black',
    coral: 'bg-nb-coral text-white border-black',
    emerald: 'bg-nb-emerald text-black border-black',
    indigo: 'bg-nb-indigo text-white border-black',
    purple: 'bg-nb-purple text-black border-black',
    cyan: 'bg-nb-cyan text-black border-black',
  };

  const badgeBgMap = {
    yellow: 'bg-black text-white',
    coral: 'bg-black text-white',
    emerald: 'bg-black text-white',
    indigo: 'bg-black text-white',
    purple: 'bg-black text-white',
    cyan: 'bg-black text-white',
  };

  return (
    <div
      className={`card-nb p-5 relative overflow-hidden ${colorMap[accentColor]} transition-transform duration-150 hover:-translate-y-1 hover:shadow-nb-lg`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-black uppercase tracking-wider font-sans">
          {title}
        </span>
        {badgeText && (
          <span className={`badge-nb ${badgeBgMap[accentColor]} text-[10px]`}>
            {badgeText}
          </span>
        )}
        {icon && <div className="opacity-90">{icon}</div>}
      </div>

      <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight my-1 break-words">
        {value}
      </div>

      <div className="text-xs font-mono font-bold opacity-80 mt-1 truncate">
        {subtext}
      </div>
    </div>
  );
};
