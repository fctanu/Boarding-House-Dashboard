import React, { useState, useMemo, useCallback, useEffect } from "react";
import { usePersistentState } from "./hooks/usePersistentState";
import type { Tenant, Room, MonthlyData } from "./types";
import { PaymentStatus } from "./types";
import { initialTenants, initialRooms } from "./data/dummyData";
import DashboardStats from "./components/DashboardStats";
import MonthlyChart from "./components/MonthlyChart";
import TenantsTable from "./components/TenantsTable";
import RoomGrid from "./components/RoomGrid";
import CSVImporter from "./components/CSVImporter";
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentArrowUpIcon,
} from "./components/Icons";

type View = "dashboard" | "payments" | "rooms" | "import";

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
        ? "bg-sky-700 text-white shadow-md font-bold" // higher contrast
        : "text-slate-800 hover:bg-sky-100 hover:text-sky-700"
    }`}
    tabIndex={0}
    aria-current={activeView === view ? "page" : undefined}
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
  // Modal state for room info
  const [roomInfo, setRoomInfo] = useState<{
    room: Room;
    tenant: Tenant | null;
  } | null>(null);
  // Room filter state
  const [roomFilter, setRoomFilter] = useState<
    "all" | "available" | "occupied"
  >("all");
  const [toast, setToast] = useState<string | null>(null);
  const [tenants, setTenants] = usePersistentState<Tenant[]>(
    "tenants",
    initialTenants
  );
  const [rooms, setRooms] = usePersistentState<Room[]>("rooms", initialRooms);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const userName = "Alex"; // Example, could be made dynamic later

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

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // For date-only comparison

    const needsUpdate = tenants.some(
      (t) =>
        t.status === PaymentStatus.Unpaid && new Date(t.dueDate) < todayDate
    );

    if (needsUpdate) {
      setTenants((prevTenants) =>
        prevTenants.map((tenant) => {
          if (
            tenant.status === PaymentStatus.Unpaid &&
            new Date(tenant.dueDate) < todayDate
          ) {
            return { ...tenant, status: PaymentStatus.Overdue };
          }
          return tenant;
        })
      );
    }
  }, [tenants, setTenants]);

  const stats = useMemo(() => {
    const availableRooms = rooms.filter((room) => room.isAvailable).length;
    const rentDueToday = tenants.filter(
      (t) => t.dueDate === today && t.status === PaymentStatus.Unpaid
    ).length;
    const totalCollectionCurrentMonth = tenants
      .filter((t) => {
        const dueDate = new Date(t.dueDate);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return (
          t.status === PaymentStatus.Paid &&
          dueDate.getMonth() === currentMonth &&
          dueDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.rentAmount, 0);

    return { availableRooms, rentDueToday, totalCollectionCurrentMonth };
  }, [rooms, tenants, today]);

  const monthlyChartData = useMemo<MonthlyData[]>(() => {
    const data: {
      [key: string]: { name: string; collected: number; due: number };
    } = {};
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    tenants.forEach((tenant) => {
      const date = new Date(tenant.dueDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month).padStart(2, "0")}`;

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
      setTenants((prevTenants) =>
        prevTenants.map((t) => (t.id === tenantId ? { ...t, status } : t))
      );
      if (status === PaymentStatus.Paid) {
        setToast("Payment recorded successfully!");
        setTimeout(() => setToast(null), 3000);
      }
    },
    [setTenants]
  );

  // Edit tenant handler
  const handleEditTenant = useCallback((tenant: Tenant) => {
    setEditTenant(tenant);
  }, []);

  const handleSaveTenant = useCallback(
    (updatedTenant: Tenant) => {
      setTenants((prevTenants) =>
        prevTenants.map((t) => (t.id === updatedTenant.id ? updatedTenant : t))
      );
      setEditTenant(null);
      setToast("Tenant updated successfully!");
      setTimeout(() => setToast(null), 3000);
    },
    [setTenants]
  );

  // Add room handler
  const handleAddRoom = useCallback(
    (roomNumber: number) => {
      setRooms((prevRooms) => [
        ...prevRooms,
        { number: roomNumber, isAvailable: true },
      ]);
      setAddRoomOpen(false);
      setToast(`Room ${roomNumber} added successfully!`);
      setTimeout(() => setToast(null), 3000);
    },
    [setRooms]
  );

  const handleImport = useCallback(
    (
      newTenants: Omit<Tenant, "id" | "status">[],
      showSuccessMessage: (count: number) => void
    ) => {
      const tenantsToAdd: Tenant[] = [];
      const roomsToUpdate = [...rooms];

      newTenants.forEach((newTenant) => {
        const roomIndex = roomsToUpdate.findIndex(
          (r) => r.number === newTenant.roomNumber
        );

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
      setToast(`${tenantsToAdd.length} tenant(s) imported successfully!`);
      setTimeout(() => setToast(null), 3000);
      setActiveView("tenants");
    },
    [rooms, setTenants, setRooms]
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 font-sans">
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-sky-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold animate-fade-in">
          {toast}
        </div>
      )}
      <aside className="w-full md:w-64 bg-white shadow-lg p-4 flex flex-col">
        <div className="text-2xl font-bold text-sky-700 mb-8 p-3">
          Boarding House OS
        </div>
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
                  "This will remove all tenants, rooms, and payments from this browser. Continue?"
                )
              )
                return;
              try {
                localStorage.removeItem("tenants");
                localStorage.removeItem("rooms");
              } catch {}
              setTenants([]);
              setRooms([]);
              setToast("All data cleared.");
              setTimeout(() => setToast(null), 2500);
            }}
          >
            Reset Data
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-10 border-b border-slate-200 pb-6">
          <h1 className="text-5xl font-extrabold text-sky-700 capitalize tracking-tight drop-shadow-lg">
            {activeView.replace("-", " ")}
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Welcome back,{" "}
            <span className="font-semibold text-sky-600">{userName}</span>!
            Here's your boarding house overview.
          </p>
          {activeView === "dashboard" && (
            <div className="mt-4">
              {tenants.filter((t) => t.status === PaymentStatus.Overdue)
                .length > 0 ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-2 font-medium">
                  <b>Alert:</b>{" "}
                  {
                    tenants.filter((t) => t.status === PaymentStatus.Overdue)
                      .length
                  }{" "}
                  tenant(s) have overdue rent!
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 font-medium">
                  All tenants are up to date on rent. Great job!
                </div>
              )}
            </div>
          )}
        </header>

        <div className={activeView === "dashboard" ? "block" : "hidden"}>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <DashboardStats stats={stats} />
          </section>
          {/* Quick actions removed as requested */}
          <hr className="my-8 border-slate-300" />
          <section>
            <MonthlyChart data={monthlyChartData} />
          </section>
        </div>
        <div className={activeView === "payments" ? "block" : "hidden"}>
          <TenantsTable
            tenants={tenants}
            onUpdateStatus={handleUpdateTenantStatus}
            onEditTenant={handleEditTenant}
          />
        </div>
        <div className={activeView === "rooms" ? "block" : "hidden"}>
          <div className="flex items-center mb-4 gap-2">
            <span className="font-bold text-lg mr-4">Room Status</span>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === "all"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
              onClick={() => setRoomFilter("all")}
            >
              All Rooms
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === "available"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
              onClick={() => setRoomFilter("available")}
            >
              Available
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                roomFilter === "occupied"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
              onClick={() => setRoomFilter("occupied")}
            >
              Occupied
            </button>
          </div>
          <RoomGrid
            rooms={rooms.filter((room) => {
              if (roomFilter === "all") return true;
              if (roomFilter === "available") return room.isAvailable;
              if (roomFilter === "occupied") return !room.isAvailable;
              return true;
            })}
            tenants={tenants}
            onAddRoom={() => setAddRoomOpen(true)}
            onRoomClick={(room) => {
              const tenant =
                tenants.find((t) => t.id === room.tenantId) || null;
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
                name: "",
                rentAmount: 0,
                dueDate: new Date().toISOString().split("T")[0],
              });
              setRoomEdit(true);
              setAddTenantQuickFlow(true);
              setTenantErrors({});
            }}
          />
        </div>
        <div className={activeView === "import" ? "block" : "hidden"}>
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
                  onChange={(e) =>
                    setEditTenant({ ...editTenant, name: e.target.value })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Room Number
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  Rent Amount
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full border px-3 py-2 rounded"
                  value={editTenant.dueDate}
                  onChange={(e) =>
                    setEditTenant({ ...editTenant, dueDate: e.target.value })
                  }
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
      {/* Room Info Modal */}
      {roomInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Room {roomInfo.room.number} Details
            </h2>
            {!roomEdit ? (
              <>
                <div className="mb-2">
                  <b>Number:</b> {roomInfo.room.number}
                </div>
                <div className="mb-2">
                  <b>Status:</b>{" "}
                  {roomInfo.room.isAvailable ? "Available" : "Occupied"}
                </div>
                {roomInfo.tenant ? (
                  <>
                    <div className="mb-2">
                      <b>Name:</b> {roomInfo.tenant.name}
                    </div>
                    <div className="mb-2">
                      <b>Rent Amount:</b> $
                      {roomInfo.tenant.rentAmount.toLocaleString()}
                    </div>
                    <div className="mb-2">
                      <b>Mobile Number:</b> {roomInfo.tenant.mobile || "N/A"}
                    </div>
                    <div className="mb-2">
                      <b>Payments:</b>{" "}
                      {roomInfo.tenant.payments
                        ? roomInfo.tenant.payments.length
                        : 0}
                    </div>
                  </>
                ) : (
                  <div className="mb-2">No tenant assigned.</div>
                )}
                <div className="flex gap-2 mt-6 justify-between">
                  <button
                    type="button"
                    className="bg-slate-200 text-slate-800 px-4 py-2 rounded font-semibold"
                    onClick={() => {
                      setRoomEdit(true);
                      if (roomInfo.tenant) {
                        setTenantDraft({
                          name: roomInfo.tenant.name,
                          rentAmount: roomInfo.tenant.rentAmount,
                          dueDate: roomInfo.tenant.dueDate,
                        });
                      } else {
                        setTenantDraft(null);
                      }
                      setAddTenantQuickFlow(false);
                      setTenantErrors({});
                    }}
                  >
                    Edit
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    className="bg-sky-600 text-white px-4 py-2 rounded font-semibold ml-auto"
                    onClick={() => setRoomInfo(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    Room Number
                  </label>
                  <input
                    type="number"
                    className="w-full border px-3 py-2 rounded"
                    value={roomDraft?.number ?? roomInfo.room.number}
                    onChange={(e) =>
                      setRoomDraft((prev) => ({
                        number: Number(e.target.value),
                        isAvailable:
                          prev?.isAvailable ?? roomInfo.room.isAvailable,
                      }))
                    }
                  />
                </div>
                {!addTenantQuickFlow && (
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      id="room-available"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        roomDraft?.isAvailable ?? roomInfo.room.isAvailable
                      }
                      onChange={(e) =>
                        setRoomDraft((prev) => ({
                          number: prev?.number ?? roomInfo.room.number,
                          isAvailable: e.target.checked,
                        }))
                      }
                    />
                    <label htmlFor="room-available" className="text-sm">
                      Available
                    </label>
                  </div>
                )}
                {!addTenantQuickFlow && (
                  <div className="text-xs text-slate-500 mb-4">
                    Note: Marking a room as Available will unassign any current
                    tenant from this room.
                  </div>
                )}
                {/* When editing: show tenant fields if marking as occupied. If tenant is null, allow creating one. */}
                {!roomDraft?.isAvailable && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tenant Name
                      </label>
                      <input
                        type="text"
                        className={`w-full border px-3 py-2 rounded ${
                          tenantErrors.name ? "border-rose-500" : ""
                        }`}
                        value={tenantDraft?.name ?? roomInfo.tenant?.name ?? ""}
                        onChange={(e) =>
                          setTenantDraft((prev) => ({
                            name: e.target.value,
                            rentAmount:
                              prev?.rentAmount ??
                              roomInfo.tenant?.rentAmount ??
                              0,
                            dueDate:
                              prev?.dueDate ??
                              roomInfo.tenant?.dueDate ??
                              new Date().toISOString().split("T")[0],
                          }))
                        }
                        onInput={() =>
                          tenantErrors.name &&
                          setTenantErrors((prev) => ({
                            ...prev,
                            name: undefined,
                          }))
                        }
                      />
                      {tenantErrors.name && (
                        <div className="text-xs text-rose-600 mt-1">
                          {tenantErrors.name}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rent Amount
                      </label>
                      <input
                        type="number"
                        className={`w-full border px-3 py-2 rounded ${
                          tenantErrors.rentAmount ? "border-rose-500" : ""
                        }`}
                        value={
                          tenantDraft?.rentAmount ??
                          roomInfo.tenant?.rentAmount ??
                          0
                        }
                        onChange={(e) =>
                          setTenantDraft((prev) => ({
                            name: prev?.name ?? roomInfo.tenant?.name ?? "",
                            rentAmount: Number(e.target.value),
                            dueDate:
                              prev?.dueDate ??
                              roomInfo.tenant?.dueDate ??
                              new Date().toISOString().split("T")[0],
                          }))
                        }
                        onInput={() =>
                          tenantErrors.rentAmount &&
                          setTenantErrors((prev) => ({
                            ...prev,
                            rentAmount: undefined,
                          }))
                        }
                      />
                      {tenantErrors.rentAmount && (
                        <div className="text-xs text-rose-600 mt-1">
                          {tenantErrors.rentAmount}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        className={`w-full border px-3 py-2 rounded ${
                          tenantErrors.dueDate ? "border-rose-500" : ""
                        }`}
                        value={
                          tenantDraft?.dueDate ??
                          roomInfo.tenant?.dueDate ??
                          new Date().toISOString().split("T")[0]
                        }
                        onChange={(e) =>
                          setTenantDraft((prev) => ({
                            name: prev?.name ?? roomInfo.tenant?.name ?? "",
                            rentAmount:
                              prev?.rentAmount ??
                              roomInfo.tenant?.rentAmount ??
                              0,
                            dueDate: e.target.value,
                          }))
                        }
                        onInput={() =>
                          tenantErrors.dueDate &&
                          setTenantErrors((prev) => ({
                            ...prev,
                            dueDate: undefined,
                          }))
                        }
                      />
                      {tenantErrors.dueDate && (
                        <div className="text-xs text-rose-600 mt-1">
                          {tenantErrors.dueDate}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    className="bg-sky-600 text-white px-4 py-2 rounded font-semibold"
                    onClick={() => {
                      if (!roomInfo || !roomDraft) {
                        setRoomEdit(false);
                        return;
                      }
                      const originalNumber = roomInfo.room.number;
                      const { number, isAvailable } = roomDraft;
                      // Validate required fields when creating a new tenant (quick add flow or no existing tenant)
                      if (!isAvailable && !roomInfo.tenant) {
                        const errs: {
                          name?: string;
                          rentAmount?: string;
                          dueDate?: string;
                        } = {};
                        const nameVal = (tenantDraft?.name ?? "").trim();
                        const rentVal = Number(tenantDraft?.rentAmount ?? 0);
                        const dueVal = (tenantDraft?.dueDate ?? "").trim();
                        if (!nameVal) errs.name = "Tenant name is required.";
                        if (!rentVal || rentVal <= 0)
                          errs.rentAmount =
                            "Rent amount must be greater than 0.";
                        if (!dueVal) errs.dueDate = "Due date is required.";
                        if (Object.keys(errs).length > 0) {
                          setTenantErrors(errs);
                          return;
                        }
                      }
                      // Validate duplicate room number
                      if (
                        number !== originalNumber &&
                        rooms.some((r) => r.number === number)
                      ) {
                        setToast(`Room ${number} already exists.`);
                        setTimeout(() => setToast(null), 3000);
                        return;
                      }
                      // Update rooms state
                      setRooms((prev) =>
                        prev
                          .map((r) => {
                            if (r.number !== originalNumber) return r;
                            const updated: Room = { ...r, number, isAvailable };
                            if (isAvailable) {
                              const { tenantId, ...rest } = updated as any;
                              return { ...rest } as Room;
                            }
                            return updated;
                          })
                          .sort((a, b) => a.number - b.number)
                      );
                      // Update tenant data: if occupied
                      if (!isAvailable) {
                        if (roomInfo.tenant) {
                          // Update existing tenant
                          setTenants((prev) =>
                            prev.map((t) =>
                              t.id === roomInfo.tenant!.id
                                ? {
                                    ...t,
                                    name: tenantDraft?.name ?? t.name,
                                    rentAmount:
                                      tenantDraft?.rentAmount ?? t.rentAmount,
                                    dueDate: tenantDraft?.dueDate ?? t.dueDate,
                                    roomNumber: number,
                                  }
                                : t
                            )
                          );
                        } else if (tenantDraft && tenantDraft.name.trim()) {
                          // Create new tenant and link to room
                          const newTenantId = `t_${Date.now()}`;
                          setTenants((prev) => [
                            ...prev,
                            {
                              id: newTenantId,
                              name: tenantDraft.name.trim(),
                              roomNumber: number,
                              mobile: "",
                              rentAmount: tenantDraft.rentAmount || 0,
                              dueDate: tenantDraft.dueDate,
                              status: PaymentStatus.Unpaid,
                              payments: [],
                            },
                          ]);
                          // Also make sure the room links to this tenant id
                          setRooms((prev) =>
                            prev.map((r) =>
                              r.number === number
                                ? {
                                    ...r,
                                    tenantId: newTenantId,
                                    isAvailable: false,
                                  }
                                : r
                            )
                          );
                        }
                      }
                      // Update local modal state
                      const updatedRoom: Room = isAvailable
                        ? { number, isAvailable: true }
                        : { ...roomInfo.room, number, isAvailable };
                      const updatedTenant = !isAvailable
                        ? roomInfo.tenant
                          ? {
                              ...roomInfo.tenant,
                              name: tenantDraft?.name ?? roomInfo.tenant.name,
                              rentAmount:
                                tenantDraft?.rentAmount ??
                                roomInfo.tenant.rentAmount,
                              dueDate:
                                tenantDraft?.dueDate ?? roomInfo.tenant.dueDate,
                              roomNumber: number,
                            }
                          : tenantDraft?.name
                          ? ({
                              id: "temp",
                              name: tenantDraft.name,
                              rentAmount: tenantDraft.rentAmount,
                              dueDate: tenantDraft.dueDate,
                              roomNumber: number,
                              status: PaymentStatus.Unpaid,
                              payments: [],
                            } as any)
                          : null
                        : null;
                      setRoomInfo({ room: updatedRoom, tenant: updatedTenant });
                      setRoomEdit(false);
                      setAddTenantQuickFlow(false);
                      setTenantErrors({});
                      setToast("Room updated successfully!");
                      setTimeout(() => setToast(null), 3000);
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-semibold"
                    onClick={() => {
                      if (addTenantQuickFlow) {
                        // In quick Add Tenant flow, closing should dismiss the modal entirely
                        setRoomEdit(false);
                        setRoomInfo(null);
                        setRoomDraft(null);
                        setTenantDraft(null);
                        setAddTenantQuickFlow(false);
                      } else {
                        // Regular edit: revert to details view
                        setRoomEdit(false);
                        setRoomDraft({
                          number: roomInfo.room.number,
                          isAvailable: roomInfo.room.isAvailable,
                        });
                        setTenantDraft(
                          roomInfo.tenant
                            ? {
                                name: roomInfo.tenant.name,
                                rentAmount: roomInfo.tenant.rentAmount,
                                dueDate: roomInfo.tenant.dueDate,
                              }
                            : null
                        );
                        setTenantErrors({});
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Add Room Modal */}
      {addRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Room</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const roomNum = Number((e.target as any).roomNum.value);
                if (roomNum) handleAddRoom(roomNum);
              }}
            >
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Room Number
                </label>
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
