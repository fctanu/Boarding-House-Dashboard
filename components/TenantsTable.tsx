
import React, { useState, useMemo } from 'react';
import type { Tenant } from '../types';
import { PaymentStatus } from '../types';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from './Icons';

interface TenantsTableProps {
    tenants: Tenant[];
    onUpdateStatus: (tenantId: string, status: PaymentStatus) => void;
}

const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full inline-flex items-center space-x-1";
    switch (status) {
        case PaymentStatus.Paid:
            return <span className={`${baseClasses} bg-emerald-100 text-emerald-700`}><CheckCircleIcon className="w-4 h-4" /><span>Paid</span></span>;
        case PaymentStatus.Unpaid:
            return <span className={`${baseClasses} bg-amber-100 text-amber-700`}><ClockIcon className="w-4 h-4" /><span>Unpaid</span></span>;
        case PaymentStatus.Overdue:
             return <span className={`${baseClasses} bg-rose-100 text-rose-700`}><ExclamationTriangleIcon className="w-4 h-4" /><span>Overdue</span></span>;
        default:
            return null;
    }
};

const TenantsTable: React.FC<TenantsTableProps> = ({ tenants, onUpdateStatus }) => {
    const [filter, setFilter] = useState('');

    const filteredTenants = useMemo(() => {
        return tenants.filter(tenant =>
            tenant.name.toLowerCase().includes(filter.toLowerCase()) ||
            tenant.roomNumber.toString().includes(filter)
        );
    }, [tenants, filter]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">All Tenants</h2>
                <input
                    type="text"
                    placeholder="Search by name or room..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-slate-600">Name</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Room</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Rent Amount</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Due Date</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-slate-600">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTenants.length > 0 ? filteredTenants.map(tenant => (
                            <tr key={tenant.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-800">{tenant.name}</td>
                                <td className="p-4 text-slate-600">{tenant.roomNumber}</td>
                                <td className="p-4 text-slate-600">${tenant.rentAmount.toLocaleString()}</td>
                                <td className="p-4 text-slate-600">{tenant.dueDate}</td>
                                <td className="p-4"><StatusBadge status={tenant.status} /></td>
                                <td className="p-4">
                                    {(tenant.status === PaymentStatus.Unpaid || tenant.status === PaymentStatus.Overdue) && (
                                        <button
                                            onClick={() => onUpdateStatus(tenant.id, PaymentStatus.Paid)}
                                            className="px-3 py-1 bg-sky-500 text-white rounded-lg text-sm font-semibold hover:bg-sky-600 transition-colors"
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-slate-500">
                                    No tenants found. Try importing some data!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TenantsTable;
