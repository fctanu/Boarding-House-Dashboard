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
import RoomModal from './components/RoomModal';
import MonthPicker from './components/MonthPicker';
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentArrowUpIcon,
} from './components/Icons';

type View = 'dashboard' | 'payments' | 'rooms' | 'import';

const NavItem = ({
  view,
  label,
  icon,
  activeView,
  setActiveView,
}: {
  view: View;
  label: string;
  icon: React.ReactNode;
  activeView: View;
  setActiveView: (v: View) => void;
}) => (
  <button
    onClick={() => setActiveView(view)}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
      activeView === view
        ? 'bg-sky-700 text-white shadow-md font-bold' // higher contrast
        : 'text-slate-800 hover:bg-sky-100 hover:text-sky-700'
    }`}
    tabIndex={0}
    aria-current={activeView === view ? 'page' : undefined}
  >
    {icon}
    <span className="font-semibold text-lg">{label}</span>
  </button>
);

const App: React.FC = () => {
  // Modal state for editing tenant
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  // Modal state for adding room
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  // Modal state for room info
  const [roomInfo, setRoomInfo] = useState<{
    room: Room;
    tenant: Tenant | null;
  } | null>(null);
  // Room filter state
  const [roomFilter, setRoomFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [tenants, setTenants] = usePersistentState<Tenant[]>('tenants', initialTenants);
  const [rooms, setRooms] = usePersistentState<Room[]>('rooms', initialRooms);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const userName = 'Alex'; // Example, could be made dynamic later

  // Room info modal edit mode state
  const [roomEdit, setRoomEdit] = useState(false);
  const [roomDraft, setRoomDraft] = useState<{
    number: number;
    isAvailable: boolean;
  } | null>(null);
  const [tenantDraft, setTenantDraft] = useState<{
    name: string;
    rentAmount: number;
    dueDate: string;
  } | null>(null);
  // Tracks if we entered edit from the quick "Available -> Add Tenant" flow
  const [addTenantQuickFlow, setAddTenantQuickFlow] = useState(false);
  // Inline validation errors for quick Add Tenant flow
  const [tenantErrors, setTenantErrors] = useState<{
    name?: string;
    rentAmount?: string;
    dueDate?: string;
  }>({});

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const showToast = useCallback((message: string, ms = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // For date-only comparison

    const needsUpdate = tenants.some(
      (t) => t.status === PaymentStatus.Unpaid && new Date(t.dueDate) < todayDate,
    );

    if (needsUpdate) {
      setTenants((prevTenants) =>
        prevTenants.map((tenant) => {
          if (tenant.status === PaymentStatus.Unpaid && new Date(tenant.dueDate) < todayDate) {
            return { ...tenant, status: PaymentStatus.Overdue };
          }
          return tenant;
        }),
      );
    }
  }, [tenants, setTenants]);

  const stats = useMemo(() => {
    const availableRooms = rooms.filter((room) => room.isAvailable).length;
    const totalRooms = rooms.length;
    const rentDueToday = tenants.filter(
      (t) => t.dueDate === today && t.status === PaymentStatus.Unpaid,
    ).length;
    const refDate = new Date(`${selectedMonth}-01`);
    const currentMonth = refDate.getMonth();
    const currentYear = refDate.getFullYear();
    const monthLabel = refDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    // Sum payments actually paid in the current month/year
    const paymentsSum = tenants.reduce((sum, t) => {
      const paidThisMonth = (t.payments ?? [])
        .filter((p) => {
          const d = new Date(p.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, p) => s + p.amount, 0);
      return sum + paidThisMonth;
    }, 0);
    // Fallback for legacy data: if a tenant is marked Paid this month but has no recorded payment, count rentAmount
    const fallbackSum = tenants
      .filter((t) => {
        const dd = new Date(t.dueDate);
        const hasPayment = (t.payments ?? []).some((p) => {
          const pd = new Date(p.date);
          return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
        });
        return t.status === PaymentStatus.Paid && dd.getMonth() === currentMonth && dd.getFullYear() === currentYear && !hasPayment;
      })
      .reduce((s, t) => s + t.rentAmount, 0);
    const totalCollectionCurrentMonth = paymentsSum + fallbackSum;

    return { availableRooms, totalRooms, rentDueToday, totalCollectionCurrentMonth, monthLabel };
  }, [rooms, tenants, today, selectedMonth]);

  const monthlyChartData = useMemo<MonthlyData[]>(() => {
    const data: {
      [key: string]: { name: string; collected: number; due: number };
    } = {};
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    tenants.forEach((tenant) => {
      const date = new Date(tenant.dueDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!data[key]) {
        data[key] = {
          name: `${monthNames[month]} '${String(year).slice(2)}`,
          collected: 0,
          due: 0,
        };
      }
      data[key].due += tenant.rentAmount;
      if (tenant.status === PaymentStatus.Paid) {
        data[key].collected += tenant.rentAmount;
      }
    });

    return Object.values(data).sort((a, b) => {
      const [aMonth, aYear] = a.name.split(" '");
      const [bMonth, bYear] = b.name.split(" '");
      const aDate = new Date(`${aMonth} 1, 20${aYear}`);
      const bDate = new Date(`${bMonth} 1, 20${bYear}`);
      return aDate.getTime() - bDate.getTime();
    });
  }, [tenants]);

  const handleUpdateTenantStatus = useCallback(
    (tenantId: string, status: PaymentStatus) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      setTenants((prevTenants) =>
        prevTenants.map((t) => {
          if (t.id !== tenantId) return t;
          if (status === PaymentStatus.Paid) {
            const payments = Array.isArray(t.payments) ? [...t.payments] : [];
            const exists = payments.some((p) => {
              const d = new Date(p.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            if (!exists) payments.push({ date: today, amount: t.rentAmount });
            return { ...t, status, payments };
          }
          if (status === PaymentStatus.Unpaid) {
            const filtered = Array.isArray(t.payments)
              ? t.payments.filter((p) => {
                  const d = new Date(p.date);
                  return !(d.getMonth() === currentMonth && d.getFullYear() === currentYear);
                })
              : [];
            return { ...t, status, payments: filtered };
          }
          return { ...t, status };
        }),
      );
      if (status === PaymentStatus.Paid) {
        showToast('Payment recorded successfully!');
      }
    },
    [setTenants, showToast, today],
  );

  const handleSaveTenant = useCallback(
    (updatedTenant: Tenant) => {
      setTenants((prevTenants) =>
        prevTenants.map((t) => (t.id === updatedTenant.id ? updatedTenant : t)),
      );
      setEditTenant(null);
      showToast('Tenant updated successfully!');
    },
    [setTenants, showToast],
  );

  // Add room handler
  const handleAddRoom = useCallback(
    (roomNumber: number) => {
      setRooms((prevRooms) => [...prevRooms, { number: roomNumber, isAvailable: true }]);
      setAddRoomOpen(false);
      showToast(`Room ${roomNumber} added successfully!`);
    },
    [setRooms, showToast],
  );

  const handleImport = useCallback(
    (newTenants: Omit<Tenant, 'id' | 'status'>[], showSuccessMessage: (count: number) => void) => {
      const tenantsToAdd: Tenant[] = [];
      const roomsToUpdate = [...rooms];

      newTenants.forEach((newTenant) => {
        const roomIndex = roomsToUpdate.findIndex((r) => r.number === newTenant.roomNumber);

        // Case 1: Room does not exist. Create it and assign tenant.
        if (roomIndex === -1) {
          const tenantId = `t_${Date.now()}_${Math.random()}`;
          tenantsToAdd.push({
            ...newTenant,
            id: tenantId,
            status: PaymentStatus.Unpaid,
          });
          roomsToUpdate.push({
            number: newTenant.roomNumber,
            isAvailable: false,
            tenantId,
          });
        }
        // Case 2: Room exists and is available. Assign tenant.
        else if (roomsToUpdate[roomIndex].isAvailable) {
          const tenantId = `t_${Date.now()}_${Math.random()}`;
          tenantsToAdd.push({
            ...newTenant,
            id: tenantId,
            status: PaymentStatus.Unpaid,
          });
          roomsToUpdate[roomIndex] = {
            ...roomsToUpdate[roomIndex],
            isAvailable: false,
            tenantId,
          };
        }
        // Case 3: Room exists and is occupied. Skip this tenant.
      });

      if (tenantsToAdd.length > 0) {
        setTenants((prev) => [...prev, ...tenantsToAdd]);
        setRooms(roomsToUpdate.sort((a, b) => a.number - b.number));
      }

      showSuccessMessage(tenantsToAdd.length);
      showToast(`${tenantsToAdd.length} tenant(s) imported successfully!`);
      setActiveView('payments');
    },
    [rooms, setTenants, setRooms, showToast],
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 font-sans">
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-sky-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold animate-fade-in">
          {toast}
        </div>
      )}
      <aside className="w-full md:w-64 bg-white shadow-lg p-4 flex flex-col">
        <div className="text-2xl font-bold text-sky-700 mb-8 p-3">Boarding House OS</div>
        <nav className="flex flex-col space-y-2">
          <NavItem
            view="dashboard"
            label="Dashboard"
            icon={<HomeIcon />}
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            view="payments"
            label="Payments"
            icon={<UserGroupIcon />}
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            view="rooms"
            label="Rooms"
            icon={<BuildingOfficeIcon />}
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            view="import"
            label="Data Import"
            icon={<DocumentArrowUpIcon />}
            activeView={activeView}
            setActiveView={setActiveView}
          />
        </nav>
        <div className="mt-6 pt-6 border-t">
          <button
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-3 rounded"
            onClick={() => {
              if (
                !confirm(
                  'This will remove all tenants, rooms, and payments from this browser. Continue?',
                )
              )
                return;
              try {
                localStorage.removeItem('tenants');
                localStorage.removeItem('rooms');
              } catch (err) {
                console.error('Failed clearing local storage', err);
              }
              setTenants([]);
              setRooms([]);
              showToast('All data cleared.', 2500);
            }}
          >
            Reset Data
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-sky-200/70 to-white">
        <header className="mb-10 border-b border-slate-200/70 pb-6">
          <h1 className="text-5xl font-extrabold text-sky-800 capitalize tracking-tight drop-shadow-sm">
            {activeView.replace('-', ' ')}
          </h1>
          <p className="text-slate-600 mt-2 text-lg">
            Welcome back, <span className="font-semibold text-sky-800">{userName}</span>. Use this dashboard to track rent collected, rooms available, and anything overdue — all in one place.
          </p>
          {activeView === 'dashboard' && (
            <div className="mt-4">
              {tenants.filter((t) => t.status === PaymentStatus.Overdue).length > 0 ? (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 font-medium shadow-sm">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-rose-400 ring-4 ring-rose-100"></span>
                  <div>
                    <b className="font-semibold">Alert:</b>{' '}
                    {tenants.filter((t) => t.status === PaymentStatus.Overdue).length} tenant(s)
                    have overdue rent!
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-4 py-3 font-medium shadow-sm">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-sky-400 ring-4 ring-sky-100"></span>
                  <div>All tenants are up to date on rent. Great job!</div>
                </div>
              )}
            </div>
          )}
        </header>

        <div className={activeView === 'dashboard' ? 'block' : 'hidden'}>
          <div className="flex items-center justify-end mb-4">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>
          <section className="mb-10">
            <DashboardStats stats={stats} density={'roomy'} />
          </section>
          {/* Quick actions removed as requested */}
          <hr className="my-8 border-slate-300" />
          <section>
            <MonthlyChart data={monthlyChartData} />
          </section>
        </div>
        <div className={activeView === 'payments' ? 'block' : 'hidden'}>
          <TenantsTable tenants={tenants} onUpdateStatus={handleUpdateTenantStatus} />
        </div>
        <div className={activeView === 'rooms' ? 'block' : 'hidden'}>
          <div className="flex items-center mb-4 gap-2">
            <span className="font-bold text-lg mr-4">Room Status</span>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
              onClick={() => setRoomFilter('all')}
            >
              All Rooms
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
              onClick={() => setRoomFilter('available')}
            >
              Available
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === 'occupied' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
              onClick={() => setRoomFilter('occupied')}
            >
              Occupied
            </button>
          </div>
          <RoomGrid
            rooms={rooms.filter((room) => {
              if (roomFilter === 'all') return true;
              if (roomFilter === 'available') return room.isAvailable;
              if (roomFilter === 'occupied') return !room.isAvailable;
              return true;
            })}
            tenants={tenants}
            onAddRoom={() => setAddRoomOpen(true)}
            onRoomClick={(room) => {
              const tenant = tenants.find((t) => t.id === room.tenantId) || null;
              setRoomInfo({ room, tenant });
              setRoomEdit(false);
              setRoomDraft({
                number: room.number,
                isAvailable: room.isAvailable,
              });
              setAddTenantQuickFlow(false);
              setTenantErrors({});
            }}
            onAddTenant={(room) => {
              // Open modal in edit mode prepared for adding a new tenant
              setRoomInfo({ room, tenant: null });
              setRoomDraft({ number: room.number, isAvailable: false });
              setTenantDraft({
                name: '',
                rentAmount: 0,
                dueDate: new Date().toISOString().split('T')[0],
              });
              setRoomEdit(true);
              setAddTenantQuickFlow(true);
              setTenantErrors({});
            }}
          />
        </div>
        <div className={activeView === 'import' ? 'block' : 'hidden'}>
          <CSVImporter onImport={handleImport} />
        </div>
      </main>
      {/* Edit Tenant Modal */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Tenant</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTenant(editTenant);
              }}
            >
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={editTenant.name}
                  onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Room Number</label>
                <input
                  type="number"
                  className="w-full border px-3 py-2 rounded"
                  value={editTenant.roomNumber}
                  onChange={(e) =>
                    setEditTenant({
                      ...editTenant,
                      roomNumber: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Rent Amount</label>
                <input
                  type="number"
                  className="w-full border px-3 py-2 rounded"
                  value={editTenant.rentAmount}
                  onChange={(e) =>
                    setEditTenant({
                      ...editTenant,
                      rentAmount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded"
                  value={editTenant.dueDate}
                  onChange={(e) => setEditTenant({ ...editTenant, dueDate: e.target.value })}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="bg-sky-600 text-white px-4 py-2 rounded font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-semibold"
                  onClick={() => setEditTenant(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Room Modal */}
      {roomInfo && (
        <RoomModal
          roomInfo={roomInfo}
          roomEdit={roomEdit}
          roomDraft={roomDraft}
          tenantDraft={tenantDraft}
          addTenantQuickFlow={addTenantQuickFlow}
          tenantErrors={tenantErrors}
          setRoomEdit={setRoomEdit}
          setRoomDraft={setRoomDraft}
          setTenantDraft={setTenantDraft}
          setAddTenantQuickFlow={setAddTenantQuickFlow}
          setTenantErrors={setTenantErrors}
          onClose={() => setRoomInfo(null)}
          onSave={({ originalNumber, number, isAvailable, hasExistingTenant, tenantDraft }) => {
            // Validate required fields when creating a new tenant (quick add flow or no existing tenant)
            if (!isAvailable && !hasExistingTenant) {
              const errs: { name?: string; rentAmount?: string; dueDate?: string } = {};
              const nameVal = (tenantDraft?.name ?? '').trim();
              const rentVal = Number(tenantDraft?.rentAmount ?? 0);
              const dueVal = (tenantDraft?.dueDate ?? '').trim();
              if (!nameVal) errs.name = 'Tenant name is required.';
              if (!rentVal || rentVal <= 0) errs.rentAmount = 'Rent amount must be greater than 0.';
              if (!dueVal) errs.dueDate = 'Due date is required.';
              if (Object.keys(errs).length > 0) {
                setTenantErrors(errs);
                return;
              }
            }
            // Validate duplicate room number
            if (number !== originalNumber && rooms.some((r) => r.number === number)) {
              showToast(`Room ${number} already exists.`);
              return;
            }
            // Update rooms
            setRooms((prev) =>
              prev
                .map((r) => {
                  if (r.number !== originalNumber) return r;
                  const next: Room = { number, isAvailable };
                  if (!isAvailable && r.tenantId) next.tenantId = r.tenantId;
                  return next;
                })
                .sort((a, b) => a.number - b.number),
            );
            // Tenants
            if (!isAvailable) {
              const roomHasTenant = hasExistingTenant;
              if (roomHasTenant && roomInfo.tenant) {
                setTenants((prev) =>
                  prev.map((t) =>
                    t.id === roomInfo.tenant!.id
                      ? {
                          ...t,
                          name: tenantDraft?.name ?? t.name,
                          rentAmount: tenantDraft?.rentAmount ?? t.rentAmount,
                          dueDate: tenantDraft?.dueDate ?? t.dueDate,
                          roomNumber: number,
                        }
                      : t,
                  ),
                );
              } else if (tenantDraft && tenantDraft.name.trim()) {
                const newTenantId = `t_${Date.now()}`;
                setTenants((prev) => [
                  ...prev,
                  {
                    id: newTenantId,
                    name: tenantDraft.name.trim(),
                    roomNumber: number,
                    mobile: '',
                    rentAmount: tenantDraft.rentAmount || 0,
                    dueDate: tenantDraft.dueDate,
                    status: PaymentStatus.Unpaid,
                    payments: [],
                  },
                ]);
                setRooms((prev) =>
                  prev.map((r) =>
                    r.number === number ? { ...r, tenantId: newTenantId, isAvailable: false } : r,
                  ),
                );
              }
            }
            // Local modal state
            const updatedRoom: Room = isAvailable
              ? { number, isAvailable: true }
              : { ...roomInfo.room, number, isAvailable };
            const updatedTenant = !isAvailable
              ? roomInfo.tenant
                ? {
                    ...roomInfo.tenant,
                    name: tenantDraft?.name ?? roomInfo.tenant.name,
                    rentAmount: tenantDraft?.rentAmount ?? roomInfo.tenant.rentAmount,
                    dueDate: tenantDraft?.dueDate ?? roomInfo.tenant.dueDate,
                    roomNumber: number,
                  }
                : tenantDraft?.name
                  ? ({
                      id: 'temp',
                      name: tenantDraft.name.trim(),
                      rentAmount: tenantDraft.rentAmount ?? 0,
                      dueDate: tenantDraft.dueDate ?? '',
                      roomNumber: number,
                      status: PaymentStatus.Unpaid,
                      payments: [],
                    } as Tenant)
                  : null
              : null;
            setRoomInfo({ room: updatedRoom, tenant: updatedTenant });
            setRoomEdit(false);
            setAddTenantQuickFlow(false);
            setTenantErrors({});
            showToast('Room updated successfully!');
          }}
        />
      )}
      {/* Add Room Modal */}
      {addRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Room</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement & { roomNum: { value: string } };
                const roomNum = Number(form.roomNum.value);
                if (!roomNum || roomNum <= 0) {
                  showToast('Please enter a valid room number greater than 0.');
                  return;
                }
                handleAddRoom(roomNum);
              }}
            >
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Room Number</label>
                <input
                  name="roomNum"
                  type="number"
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="bg-sky-600 text-white px-4 py-2 rounded font-semibold"
                >
                  Add
                </button>
                <button
                  type="button"
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-semibold"
                  onClick={() => setAddRoomOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
