import React from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return new Date().toISOString().slice(0, 7);
  return value;
}

export default function MonthPicker({
  value,
  onChange,
  className = '',
  label = 'Month',
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  label?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const monthBtnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = React.useState(false);
  const safeValue = fmt(value);
  const [year, setYear] = React.useState(() => Number(safeValue.split('-')[0]));
  const selectedMonthIndex = Number(safeValue.split('-')[1]) - 1;

  React.useEffect(() => {
    setYear(Number(fmt(value).split('-')[0]));
  }, [value]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const now = new Date();
    let focusIndex = selectedMonthIndex;
    if (year === now.getFullYear()) focusIndex = now.getMonth();
    const el = monthBtnRefs.current[focusIndex];
    if (el) el.focus();
  }, [open, year, selectedMonthIndex]);

  const monthLabel = React.useMemo(() => {
    const d = new Date(`${safeValue}-01`);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, [safeValue]);

  const apply = (mIndex: number) => {
    const next = `${year}-${String(mIndex + 1).padStart(2, '0')}`;
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <label className="text-sm text-slate-600 mr-2">{label}:</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="text-sky-700" width={18} height={18} />
        <span className="font-semibold text-slate-800">{monthLabel}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-xl p-3 z-50"
          role="dialog"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <button
              type="button"
              className="p-1 rounded hover:bg-sky-50 text-slate-600 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <div className="text-slate-800 font-semibold select-none">{year}</div>
            <button
              type="button"
              className="p-1 rounded hover:bg-sky-50 text-slate-600 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => {
              const selected = i === selectedMonthIndex && year === Number(safeValue.split('-')[0]);
              const now = new Date();
              const isCurrent = i === now.getMonth() && year === now.getFullYear();
              const base = 'text-sm px-2 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500';
              const cls = selected
                ? 'bg-sky-600 text-white shadow'
                : isCurrent
                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                : 'text-slate-700 hover:bg-sky-50 hover:text-sky-700';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => apply(i)}
                  className={`${base} ${cls}`}
                  ref={(el) => (monthBtnRefs.current[i] = el)}
                  aria-current={isCurrent ? 'date' : undefined}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
