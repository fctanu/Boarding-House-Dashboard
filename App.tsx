import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import type { Tenant, Room, MonthlyData } from './types';
import { PaymentStatus } from './types';
import { initialTenants, initialRooms } from './data/dummyData';
import DashboardStats from './components/DashboardStats';
import MonthlyChart from './components/MonthlyChart';
import TenantsTable from './components/TenantsTable';
import RoomGrid from './components/RoomGrid';
import CSVImporter from './components/CSVImporter';
import { HomeIcon, UserGroupIcon, BuildingOfficeIcon, DocumentArrowUpIcon } from './components/Icons';

type View = 'dashboard' | 'tenants' | 'rooms' | 'import';

const NavItem = ({ view, label, icon, activeView, setActiveView }: { view: View; label: string; icon: React.ReactNode; activeView: View; setActiveView: (v: View) => void; }) => (
    <button
        onClick={() => setActiveView(view)}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-200 ${
            activeView === view
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
        }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

const App: React.FC = () => {
    const [tenants, setTenants] = usePersistentState<Tenant[]>('tenants', initialTenants);
    const [rooms, setRooms] = usePersistentState<Room[]>('rooms', initialRooms);
    const [activeView, setActiveView] = useState<View>('dashboard');

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    useEffect(() => {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0); // For date-only comparison

        const needsUpdate = tenants.some(t => t.status === PaymentStatus.Unpaid && new Date(t.dueDate) < todayDate);

        if (needsUpdate) {
            setTenants(prevTenants =>
                prevTenants.map(tenant => {
                    if (tenant.status === PaymentStatus.Unpaid && new Date(tenant.dueDate) < todayDate) {
                        return { ...tenant, status: PaymentStatus.Overdue };
                    }
                    return tenant;
                })
            );
        }
    }, [tenants, setTenants]);


    const stats = useMemo(() => {
        const availableRooms = rooms.filter(room => room.isAvailable).length;
        const rentDueToday = tenants.filter(t => t.dueDate === today && t.status === PaymentStatus.Unpaid).length;
        const totalCollectionCurrentMonth = tenants
            .filter(t => {
                const dueDate = new Date(t.dueDate);
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                return t.status === PaymentStatus.Paid && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.rentAmount, 0);

        return { availableRooms, rentDueToday, totalCollectionCurrentMonth };
    }, [rooms, tenants, today]);

    const monthlyChartData = useMemo<MonthlyData[]>(() => {
        const data: { [key: string]: { name: string; collected: number; due: number } } = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        tenants.forEach(tenant => {
            const date = new Date(tenant.dueDate);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${String(month).padStart(2, '0')}`;

            if (!data[key]) {
                data[key] = { name: `${monthNames[month]} '${String(year).slice(2)}`, collected: 0, due: 0 };
            }
            data[key].due += tenant.rentAmount;
            if (tenant.status === PaymentStatus.Paid) {
                data[key].collected += tenant.rentAmount;
            }
        });
        
        return Object.values(data).sort((a,b) => {
             const [aMonth, aYear] = a.name.split(" '");
             const [bMonth, bYear] = b.name.split(" '");
             const aDate = new Date(`${aMonth} 1, 20${aYear}`);
             const bDate = new Date(`${bMonth} 1, 20${bYear}`);
             return aDate.getTime() - bDate.getTime();
        });
    }, [tenants]);

    const handleUpdateTenantStatus = useCallback((tenantId: string, status: PaymentStatus) => {
        setTenants(prevTenants =>
            prevTenants.map(t => (t.id === tenantId ? { ...t, status } : t))
        );
    }, [setTenants]);
    
    const handleImport = useCallback((
        newTenants: Omit<Tenant, 'id' | 'status'>[],
        showSuccessMessage: (count: number) => void
    ) => {
        const tenantsToAdd: Tenant[] = [];
        const roomsToUpdate = [...rooms];

        newTenants.forEach(newTenant => {
            const roomIndex = roomsToUpdate.findIndex(r => r.number === newTenant.roomNumber);

            // Case 1: Room does not exist. Create it and assign tenant.
            if (roomIndex === -1) {
                const tenantId = `t_${Date.now()}_${Math.random()}`;
                tenantsToAdd.push({ ...newTenant, id: tenantId, status: PaymentStatus.Unpaid });
                roomsToUpdate.push({ number: newTenant.roomNumber, isAvailable: false, tenantId });
            } 
            // Case 2: Room exists and is available. Assign tenant.
            else if (roomsToUpdate[roomIndex].isAvailable) {
                const tenantId = `t_${Date.now()}_${Math.random()}`;
                tenantsToAdd.push({ ...newTenant, id: tenantId, status: PaymentStatus.Unpaid });
                roomsToUpdate[roomIndex] = { ...roomsToUpdate[roomIndex], isAvailable: false, tenantId };
            }
            // Case 3: Room exists and is occupied. Skip this tenant.
        });

        if (tenantsToAdd.length > 0) {
            setTenants(prev => [...prev, ...tenantsToAdd]);
            setRooms(roomsToUpdate.sort((a, b) => a.number - b.number));
        }
        
        showSuccessMessage(tenantsToAdd.length);
        setActiveView('tenants');
    }, [rooms, setTenants, setRooms]);
    
    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <aside className="w-64 bg-white shadow-lg p-4 flex flex-col">
                <div className="text-2xl font-bold text-sky-700 mb-8 p-3">Boarding House OS</div>
                <nav className="flex flex-col space-y-2">
                    <NavItem view="dashboard" label="Dashboard" icon={<HomeIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="tenants" label="Tenants" icon={<UserGroupIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="rooms" label="Rooms" icon={<BuildingOfficeIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="import" label="Data Import" icon={<DocumentArrowUpIcon />} activeView={activeView} setActiveView={setActiveView} />
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 capitalize">{activeView.replace('-', ' ')}</h1>
                    <p className="text-slate-500 mt-1">Welcome back, here's your boarding house overview.</p>
                </header>

                <div className={activeView === 'dashboard' ? 'block' : 'hidden'}>
                     <DashboardStats stats={stats} />
                     <div className="mt-8">
                        <MonthlyChart data={monthlyChartData} />
                    </div>
                </div>
                <div className={activeView === 'tenants' ? 'block' : 'hidden'}>
                    <TenantsTable tenants={tenants} onUpdateStatus={handleUpdateTenantStatus} />
                </div>
                <div className={activeView === 'rooms' ? 'block' : 'hidden'}>
                    <RoomGrid rooms={rooms} tenants={tenants} />
                </div>
                <div className={activeView === 'import' ? 'block' : 'hidden'}>
                    <CSVImporter onImport={handleImport} />
                </div>
            </main>
        </div>
    );
};

export default App;