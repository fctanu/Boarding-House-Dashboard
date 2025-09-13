import React from 'react';
import type { MonthlyData } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyChartProps {
  data: MonthlyData[];
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Monthly Rent Collection</h2>
      {data.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <p>No payment data available to display chart.</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(v) => `$${(v as number).toLocaleString()}`} />
              <YAxis type="category" dataKey="name" width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="collected" fill="#0369a1" name="Collected" radius={[0, 4, 4, 0]} />
              <Bar dataKey="due" fill="#f59e0b" name="Total Due" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MonthlyChart;
