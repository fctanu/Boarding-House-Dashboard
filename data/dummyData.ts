import type { Tenant, Room } from '../types';
import { PaymentStatus } from '../types';

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const tenants: Omit<Tenant, 'id'>[] = [
    { name: 'Alice Johnson', roomNumber: 1, rentAmount: 550, dueDate: formatDate(new Date(currentYear, currentMonth - 2, 5)), status: PaymentStatus.Paid },
    { name: 'Bob Williams', roomNumber: 2, rentAmount: 600, dueDate: formatDate(new Date(currentYear, currentMonth - 2, 5)), status: PaymentStatus.Paid },
    { name: 'Charlie Brown', roomNumber: 3, rentAmount: 575, dueDate: formatDate(new Date(currentYear, currentMonth - 1, 1)), status: PaymentStatus.Paid },
    { name: 'Diana Miller', roomNumber: 4, rentAmount: 720, dueDate: formatDate(new Date(currentYear, currentMonth - 1, 1)), status: PaymentStatus.Paid },
    { name: 'Ethan Davis', roomNumber: 5, rentAmount: 650, dueDate: formatDate(new Date(currentYear, currentMonth, 1)), status: PaymentStatus.Paid },
    { name: 'Fiona Garcia', roomNumber: 6, rentAmount: 800, dueDate: formatDate(new Date(currentYear, currentMonth, 1)), status: PaymentStatus.Unpaid },
    { name: 'George Rodriguez', roomNumber: 7, rentAmount: 815, dueDate: formatDate(new Date(currentYear, currentMonth, 5)), status: PaymentStatus.Unpaid },
    { name: 'Hannah Martinez', roomNumber: 8, rentAmount: 590, dueDate: formatDate(new Date(currentYear, currentMonth, 5)), status: PaymentStatus.Unpaid },
    { name: 'Ian Smith', roomNumber: 9, rentAmount: 710, dueDate: formatDate(new Date(currentYear, currentMonth, 10)), status: PaymentStatus.Unpaid },
    { name: 'Jane Doe', roomNumber: 10, rentAmount: 750, dueDate: formatDate(new Date(currentYear, currentMonth - 1, 15)), status: PaymentStatus.Overdue },
    { name: 'Kevin White', roomNumber: 11, rentAmount: 680, dueDate: formatDate(new Date(currentYear, currentMonth - 3, 20)), status: PaymentStatus.Paid },
];

export const initialTenants: Tenant[] = tenants.map((t, i) => ({
    ...t,
    id: `t_initial_${i}`
}));

const occupiedRoomNumbers = new Set(initialTenants.map(t => t.roomNumber));
const initialRoomsFromTenants = initialTenants.map(t => ({
    number: t.roomNumber,
    isAvailable: false,
    tenantId: t.id
}));

const availableRooms = Array.from({ length: 20 }, (_, i) => i + 1)
    .filter(roomNum => !occupiedRoomNumbers.has(roomNum))
    .map(roomNum => ({
        number: roomNum,
        isAvailable: true
    }));

export const initialRooms: Room[] = [...initialRoomsFromTenants, ...availableRooms].sort((a,b) => a.number - b.number);
