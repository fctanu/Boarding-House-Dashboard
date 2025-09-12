import React, { useState, useEffect } from 'react';
import type { MonthlyData } from '../types';

// Recharts is loaded from a CDN, so we declare it as a global
declare const Recharts: any;

interface MonthlyChartProps {
    data: MonthlyData[];
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
    const [chartLibraryStatus, setChartLibraryStatus] = useState<'loading' | 'loaded' | 'error'>(
        typeof Recharts !== 'undefined' ? 'loaded' : 'loading'
    );

    useEffect(() => {
        if (chartLibraryStatus === 'loading') {
            let attempts = 0;
            const maxAttempts = 100; // Try for 10 seconds (100 * 100ms)
            const intervalId = setInterval(() => {
                if (typeof Recharts !== 'undefined') {
                    setChartLibraryStatus('loaded');
                    clearInterval(intervalId);
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        setChartLibraryStatus('error');
                        clearInterval(intervalId);
                    }
                }
            }, 100);

            return () => clearInterval(intervalId);
        }
    }, [chartLibraryStatus]);

    const renderContent = () => {
        switch (chartLibraryStatus) {
            case 'loading':
                return (
                    <div className="h-96 flex items-center justify-center text-slate-500">
                        <p>Loading chart library...</p>
                    </div>
                );
            case 'error':
                return (
                    <div className="h-96 flex items-center justify-center text-center">
                        <div>
                            <p className="text-rose-600 bg-rose-50 p-4 rounded-lg">
                                <b>Error:</b> The chart library failed to load. <br />
                                Please check your internet connection and refresh the page.
                            </p>
                        </div>
                    </div>
                );
            case 'loaded':
                if (data.length === 0) {
                    return (
                        <div className="h-96 flex items-center justify-center text-slate-500">
                            <p>No payment data available to display chart.</p>
                        </div>
                    );
                }
                
                const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
                return (
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart
                                data={data}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #ccc',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => `$${value.toLocaleString()}`}
                                />
                                <Legend />
                                <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="due" fill="#0ea5e9" name="Total Due" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Monthly Rent Collection</h2>
            {renderContent()}
        </div>
    );
};

export default MonthlyChart;