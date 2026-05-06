'use client';

import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  label,
  className = '',
}: DatePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Parse selected date
  const selected = value ? new Date(value + 'T00:00:00') : null;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When value changes externally, sync view
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]);

  const minDate = min ? new Date(min + 'T00:00:00') : null;
  const maxDate = max ? new Date(max + 'T00:00:00') : null;

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return date.toDateString() === selected.toDateString();
  };

  const isToday = (date: Date) => date.toDateString() === today.toDateString();

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewYear, viewMonth, d));
  }

  const handleSelect = (date: Date) => {
    if (isDisabled(date)) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const displayValue = selected
    ? selected.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      )}

      {/* Input trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
      >
        <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-gray-900">
              {MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;

              const disabled = isDisabled(date);
              const sel = isSelected(date);
              const tod = isToday(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelect(date)}
                  disabled={disabled}
                  className={`
                    w-full aspect-square rounded-md text-xs font-medium transition-colors
                    ${disabled ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50 hover:text-blue-700'}
                    ${sel ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                    ${tod && !sel ? 'border border-blue-400 text-blue-600' : ''}
                    ${!sel && !tod && !disabled ? 'text-gray-700' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {value && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
