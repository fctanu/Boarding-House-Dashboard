
import React from 'react';
import { CollectionIcon, HomeModernIcon, CalendarAlertIcon } from './Icons';

interface DashboardStatsProps {
    stats: {
        availableRooms: number;
        rentDueToday: number;
        totalCollectionCurrentMonth: number;
    };
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 transition-transform transform hover:scale-105">
            <div className={`rounded-full p-3 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
                title="Total Collection (This Month)"
                value={`$${stats.totalCollectionCurrentMonth.toLocaleString()}`}
                icon={<CollectionIcon />}
                color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
                title="Available Rooms"
                value={stats.availableRooms}
                icon={<HomeModernIcon />}
                color="bg-sky-100 text-sky-600"
            />
            <StatCard
                title="Rent Due Today"
                value={stats.rentDueToday}
                icon={<CalendarAlertIcon />}
                color="bg-amber-100 text-amber-600"
            />
        </div>
    );
};

export default DashboardStats;
