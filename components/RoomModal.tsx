import React from 'react';
import type { Room, Tenant } from '../types';

export interface RoomDraft {
  number: number;
  isAvailable: boolean;
}

interface RoomModalProps {
  roomInfo: { room: Room; tenant: Tenant | null };
  roomEdit: boolean;
  roomDraft: RoomDraft | null;
  tenantDraft: { name: string; rentAmount: number; dueDate: string } | null;
  addTenantQuickFlow: boolean;
  tenantErrors: { name?: string; rentAmount?: string; dueDate?: string };
  setRoomEdit: (edit: boolean) => void;
  setRoomDraft: React.Dispatch<React.SetStateAction<RoomDraft | null>>;
  setTenantDraft: React.Dispatch<
    React.SetStateAction<{ name: string; rentAmount: number; dueDate: string } | null>
  >;
  setAddTenantQuickFlow: (v: boolean) => void;
  setTenantErrors: React.Dispatch<
    React.SetStateAction<{ name?: string; rentAmount?: string; dueDate?: string }>
  >;
  onClose: () => void;
  onSave: (args: {
    originalNumber: number;
    number: number;
    isAvailable: boolean;
    hasExistingTenant: boolean;
    tenantDraft: { name: string; rentAmount: number; dueDate: string } | null;
  }) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({
  roomInfo,
  roomEdit,
  roomDraft,
  tenantDraft,
  addTenantQuickFlow,
  tenantErrors,
  setRoomEdit,
  setRoomDraft,
  setTenantDraft,
  setAddTenantQuickFlow,
  setTenantErrors,
  onClose,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Room {roomInfo.room.number} Details</h2>
        {!roomEdit ? (
          <>
            <div className="mb-2">
              <b>Number:</b> {roomInfo.room.number}
            </div>
            <div className="mb-2">
              <b>Status:</b> {roomInfo.room.isAvailable ? 'Available' : 'Occupied'}
            </div>
            {roomInfo.tenant ? (
              <>
                <div className="mb-2">
                  <b>Name:</b> {roomInfo.tenant.name}
                </div>
                <div className="mb-2">
                  <b>Rent Amount:</b> ${roomInfo.tenant.rentAmount.toLocaleString()}
                </div>
                <div className="mb-2">
                  <b>Mobile Number:</b> {roomInfo.tenant.mobile || 'N/A'}
                </div>
                <div className="mb-2">
                  <b>Payments:</b> {roomInfo.tenant.payments ? roomInfo.tenant.payments.length : 0}
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
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Room Number</label>
              <input
                type="number"
                className="w-full border px-3 py-2 rounded"
                value={roomDraft?.number ?? roomInfo.room.number}
                onChange={(e) =>
                  setRoomDraft((prev) => ({
                    number: Number(e.target.value),
                    isAvailable: prev?.isAvailable ?? roomInfo.room.isAvailable,
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
                  checked={roomDraft?.isAvailable ?? roomInfo.room.isAvailable}
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
                Note: Marking a room as Available will unassign any current tenant from this room.
              </div>
            )}
            {!roomDraft?.isAvailable && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant Name</label>
                  <input
                    type="text"
                    className={`w-full border px-3 py-2 rounded ${tenantErrors.name ? 'border-rose-500' : ''}`}
                    value={tenantDraft?.name ?? roomInfo.tenant?.name ?? ''}
                    onChange={(e) =>
                      setTenantDraft((prev) => ({
                        name: e.target.value,
                        rentAmount: prev?.rentAmount ?? roomInfo.tenant?.rentAmount ?? 0,
                        dueDate:
                          prev?.dueDate ??
                          roomInfo.tenant?.dueDate ??
                          new Date().toISOString().split('T')[0],
                      }))
                    }
                    onInput={() =>
                      tenantErrors.name && setTenantErrors((prev) => ({ ...prev, name: undefined }))
                    }
                  />
                  {tenantErrors.name && (
                    <div className="text-xs text-rose-600 mt-1">{tenantErrors.name}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rent Amount</label>
                  <input
                    type="number"
                    className={`w-full border px-3 py-2 rounded ${tenantErrors.rentAmount ? 'border-rose-500' : ''}`}
                    value={tenantDraft?.rentAmount ?? roomInfo.tenant?.rentAmount ?? 0}
                    onChange={(e) =>
                      setTenantDraft((prev) => ({
                        name: prev?.name ?? roomInfo.tenant?.name ?? '',
                        rentAmount: Number(e.target.value),
                        dueDate:
                          prev?.dueDate ??
                          roomInfo.tenant?.dueDate ??
                          new Date().toISOString().split('T')[0],
                      }))
                    }
                    onInput={() =>
                      tenantErrors.rentAmount &&
                      setTenantErrors((prev) => ({ ...prev, rentAmount: undefined }))
                    }
                  />
                  {tenantErrors.rentAmount && (
                    <div className="text-xs text-rose-600 mt-1">{tenantErrors.rentAmount}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    className={`w-full border px-3 py-2 rounded ${tenantErrors.dueDate ? 'border-rose-500' : ''}`}
                    value={
                      tenantDraft?.dueDate ??
                      roomInfo.tenant?.dueDate ??
                      new Date().toISOString().split('T')[0]
                    }
                    onChange={(e) =>
                      setTenantDraft((prev) => ({
                        name: prev?.name ?? roomInfo.tenant?.name ?? '',
                        rentAmount: prev?.rentAmount ?? roomInfo.tenant?.rentAmount ?? 0,
                        dueDate: e.target.value,
                      }))
                    }
                    onInput={() =>
                      tenantErrors.dueDate &&
                      setTenantErrors((prev) => ({ ...prev, dueDate: undefined }))
                    }
                  />
                  {tenantErrors.dueDate && (
                    <div className="text-xs text-rose-600 mt-1">{tenantErrors.dueDate}</div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="bg-sky-600 text-white px-4 py-2 rounded font-semibold"
                onClick={() =>
                  onSave({
                    originalNumber: roomInfo.room.number,
                    number: roomDraft?.number ?? roomInfo.room.number,
                    isAvailable: roomDraft?.isAvailable ?? roomInfo.room.isAvailable,
                    hasExistingTenant: Boolean(roomInfo.tenant),
                    tenantDraft,
                  })
                }
              >
                Save
              </button>
              <button
                type="button"
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-semibold"
                onClick={() => {
                  if (addTenantQuickFlow) {
                    setRoomEdit(false);
                    onClose();
                    setRoomDraft(null);
                    setTenantDraft(null);
                    setAddTenantQuickFlow(false);
                  } else {
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
                        : null,
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
  );
};

export default RoomModal;
