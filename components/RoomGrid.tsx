
import React from 'react';
import type { Room, Tenant } from '../types';
import { UserCircleIcon, CheckIcon } from './Icons';

interface RoomGridProps {
    rooms: Room[];
    tenants: Tenant[];
}

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, tenants }) => {

    const getTenantForRoom = (roomId?: string) => {
        if (!roomId) return null;
        return tenants.find(t => t.id === roomId);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Room Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {rooms.map(room => {
                    const tenant = getTenantForRoom(room.tenantId);
                    const cardClasses = room.isAvailable 
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-sky-50 border-sky-200';
                    
                    return (
                        <div key={room.number} className={`p-4 rounded-lg border-2 ${cardClasses}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg text-slate-700">Room {room.number}</span>
                                {room.isAvailable ? (
                                    <span className="text-emerald-500"><CheckIcon /></span>
                                ) : (
                                    <span className="text-sky-500"><UserCircleIcon /></span>
                                )}
                            </div>
                            {room.isAvailable ? (
                                <p className="text-sm text-emerald-700 mt-2">Available</p>
                            ) : (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-sky-800">{tenant?.name || 'Occupied'}</p>
                                    <p className="text-xs text-slate-500">Due: {tenant?.dueDate}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RoomGrid;
