import React, { useState, useCallback } from 'react';
import type { Tenant } from '../types';

interface CSVImporterProps {
    onImport: (tenants: Omit<Tenant, 'id' | 'status'>[], showSuccessMessage: (count: number) => void) => void;
}

const parseAndFormatDate = (dateStr: string): string => {
    const trimmedDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        return trimmedDate;
    }
    const parts = trimmedDate.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    throw new Error(`Invalid date format: "${dateStr}". Please use YYYY-MM-DD or DD/MM/YYYY.`);
};

const CSVImporter: React.FC<CSVImporterProps> = ({ onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [format, setFormat] = useState<'csv' | 'json'>('csv');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
            setError(null);
            setSuccessMessage(null);
        }
    };
    
    const handleSetFormat = (newFormat: 'csv' | 'json') => {
        setFormat(newFormat);
        setFile(null);
        setError(null);
        setSuccessMessage(null);
        const fileInput = document.getElementById('file-importer-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }

    const parseCSV = (csvText: string): Omit<Tenant, 'id' | 'status'>[] => {
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        const headers = rows.shift()?.trim().split(',').map(h => h.trim()) || [];
        
        if (headers.join(',') !== 'name,roomNumber,rentAmount,dueDate') {
            throw new Error('Invalid CSV headers. Expected: name,roomNumber,rentAmount,dueDate');
        }

        return rows.map((row, index) => {
            const values = row.split(',');
            if (values.length !== headers.length) {
                throw new Error(`Row ${index + 2} has incorrect number of columns.`);
            }
            const name = values[0]?.trim();
            const roomNumberStr = values[1]?.trim();
            const rentAmountStr = values[2]?.trim();
            const dueDateStr = values[3]?.trim();

            if (!name || !roomNumberStr || !rentAmountStr || !dueDateStr) {
                 throw new Error(`Invalid or missing data on row ${index + 2}. Please check all values are present.`);
            }

            const roomNumber = parseInt(roomNumberStr, 10);
            const rentAmount = parseFloat(rentAmountStr);
            
            if (isNaN(roomNumber) || isNaN(rentAmount)) {
                throw new Error(`Invalid number format on row ${index + 2}. Check room number and rent amount.`);
            }

            const dueDate = parseAndFormatDate(dueDateStr);
            return { name, roomNumber, rentAmount, dueDate };
        });
    };

    const parseJSON = (jsonText: string): Omit<Tenant, 'id' | 'status'>[] => {
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            throw new Error('Invalid JSON file. Could not parse the content.');
        }

        if (!Array.isArray(data)) {
            throw new Error('Invalid JSON format. The file should contain an array of tenant objects.');
        }

        return data.map((item, index) => {
            const { name, roomNumber, rentAmount, dueDate: dueDateStr } = item;
            
            if (typeof name !== 'string' || typeof roomNumber !== 'number' || typeof rentAmount !== 'number' || typeof dueDateStr !== 'string') {
                throw new Error(`Invalid data type in object at index ${index}. Check that name/dueDate are strings and roomNumber/rentAmount are numbers.`);
            }

            const dueDate = parseAndFormatDate(dueDateStr);
            return { name, roomNumber, rentAmount, dueDate };
        });
    };

    const handleImportClick = useCallback(() => {
        if (!file) {
            setError('Please select a file to import.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const tenantsData = format === 'csv' ? parseCSV(text) : parseJSON(text);

                onImport(tenantsData, (importedCount) => {
                    if (importedCount > 0) {
                        setSuccessMessage(`${importedCount} tenants imported successfully!`);
                    } else if (tenantsData.length > 0) {
                        setError(`Import failed. The rooms for tenants in the file may already be occupied.`);
                        setSuccessMessage(null);
                    }
                });
                
                setFile(null);
                const fileInput = document.getElementById('file-importer-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred during parsing.');
                }
                setSuccessMessage(null);
            }
        };
        reader.onerror = () => {
            setError('Failed to read the file.');
            setSuccessMessage(null);
        };
        reader.readAsText(file);
    }, [file, onImport, format]);

    const CSVInstructions = () => (
        <>
            <p className="text-sm text-slate-600 mb-2">
                Your CSV file must have the following headers in the first row, in this exact order:
            </p>
            <code className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-sm">name,roomNumber,rentAmount,dueDate</code>
            <ul className="list-disc list-inside text-sm text-slate-600 mt-2 space-y-1">
                <li><span className="font-semibold">name:</span> Tenant's full name (e.g., John Doe)</li>
                <li><span className="font-semibold">roomNumber:</span> The assigned room number (e.g., 101)</li>
                <li><span className="font-semibold">rentAmount:</span> The monthly rent, numbers only (e.g., 550.00)</li>
                <li><span className="font-semibold">dueDate:</span> The next due date in YYYY-MM-DD or DD/MM/YYYY format</li>
            </ul>
        </>
    );

    const JSONInstructions = () => (
        <>
            <p className="text-sm text-slate-600 mb-2">
                Your JSON file must be an array of objects, where each object represents a tenant.
            </p>
            <p className="text-sm text-slate-600 mb-2">Example object structure:</p>
            <pre className="bg-slate-200 text-slate-800 p-2 rounded text-sm overflow-x-auto">
                <code>
{`[
  {
    "name": "Jane Smith",
    "roomNumber": 102,
    "rentAmount": 600.50,
    "dueDate": "2024-10-01"
  }
]`}
                </code>
            </pre>
            <ul className="list-disc list-inside text-sm text-slate-600 mt-2 space-y-1">
                <li><span className="font-semibold">name:</span> Must be a <code className="text-xs">string</code>.</li>
                <li><span className="font-semibold">roomNumber:</span> Must be a <code className="text-xs">number</code>.</li>
                <li><span className="font-semibold">rentAmount:</span> Must be a <code className="text-xs">number</code>.</li>
                <li><span className="font-semibold">dueDate:</span> Must be a <code className="text-xs">string</code> in YYYY-MM-DD or DD/MM/YYYY format.</li>
            </ul>
        </>
    );

    return (
        <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bulk Import Tenants</h2>
            <p className="text-slate-500 mb-6">Upload a CSV or JSON file to add multiple tenants at once.</p>
            
            <div className="mb-6">
                <span className="text-sm font-medium text-slate-700 mr-4">Choose import format:</span>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button 
                        type="button" 
                        onClick={() => handleSetFormat('csv')}
                        className={`px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${format === 'csv' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        CSV
                    </button>
                    <button 
                        type="button" 
                        onClick={() => handleSetFormat('json')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r transition-colors ${format === 'json' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        JSON
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                <h3 className="font-semibold text-slate-700 mb-2">File Format Instructions</h3>
                {format === 'csv' ? <CSVInstructions /> : <JSONInstructions />}
            </div>

            <div className="flex items-center space-x-4">
                 <label className="block w-full">
                    <span className="sr-only">Choose file</span>
                    <input type="file" onChange={handleFileChange} accept={format === 'csv' ? '.csv' : '.json'}
                      id="file-importer-input"
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-sky-50 file:text-sky-700
                        hover:file:bg-sky-100"
                    />
                </label>
                <button
                    onClick={handleImportClick}
                    disabled={!file}
                    className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    Import
                </button>
            </div>

            {error && <p className="mt-4 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{error}</p>}
            {successMessage && <p className="mt-4 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">{successMessage}</p>}
        </div>
    );
};

export default CSVImporter;