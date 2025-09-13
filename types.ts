
export enum PaymentStatus {
  Paid = 'Paid',
  Unpaid = 'Unpaid',
  Overdue = 'Overdue'
}

export interface Tenant {
  id: string;
  name: string;
  roomNumber: number;
  rentAmount: number;
  dueDate: string; // ISO format 'YYYY-MM-DD'
  status: PaymentStatus;
  mobile?: string;
  payments?: Array<{ date: string; amount: number }>;
}

export interface Room {
  number: number;
  isAvailable: boolean;
  tenantId?: string;
}

export interface MonthlyData {
  name: string;
  collected: number;
  due: number;
}
