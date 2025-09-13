import React from 'react';
import { CollectionIcon, HomeModernIcon, CalendarAlertIcon } from './Icons';

interface DashboardStatsProps {
  stats: {
    availableRooms: number;
    totalRooms?: number;
    rentDueToday: number;
    totalCollectionCurrentMonth: number;
    monthLabel?: string;
  };
  density?: 'roomy' | 'compact';
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  density: 'roomy' | 'compact';
}> = ({ title, value, icon, color, density }) => {
  return (
    <div
      className={`h-full bg-white ${density === 'compact' ? 'p-4' : 'p-6'} rounded-xl shadow-sm ring-1 ring-slate-200/70 flex items-center ${density === 'compact' ? 'space-x-3' : 'space-x-4'} transition-transform transform hover:-translate-y-0.5`}
    >
      <div
        className={`rounded-full ${density === 'compact' ? 'p-2.5' : 'p-3'} ${color} shadow-inner`}
      >
        {icon}
      </div>
      <div>
        <p
          className={`font-medium text-slate-600 ${density === 'compact' ? 'text-xs' : 'text-sm'}`}
        >
          {title}
        </p>
        <p
          className={`${density === 'compact' ? 'text-xl' : 'text-2xl'} font-extrabold text-slate-900`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, density = 'roomy' }) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-3 items-stretch ${density === 'compact' ? 'gap-4' : 'gap-6'}`}
    >
      <StatCard
        title={`Total Collection (${stats.monthLabel ?? 'This Month'})`}
        value={`$${stats.totalCollectionCurrentMonth.toLocaleString()}`}
        icon={<CollectionIcon />}
        color="bg-sky-200 text-sky-800"
        density={density}
      />
      <StatCard
        title="Available Rooms"
        value={`${stats.availableRooms}${typeof stats.totalRooms === 'number' ? ` / ${stats.totalRooms}` : ''}`}
        icon={<HomeModernIcon />}
        color="bg-sky-200 text-sky-800"
        density={density}
      />
      <StatCard
        title="Rent Due Today"
        value={stats.rentDueToday}
        icon={<CalendarAlertIcon />}
        color="bg-amber-200 text-amber-800"
        density={density}
      />
    </div>
  );
};

export default DashboardStats;
