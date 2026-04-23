'use client';

export type FilterType = 'all' | 'active' | 'completed';

export default function FilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  counts: { all: number; active: number; completed: number };
}) {
  const buttons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => onFilterChange(btn.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              filter === btn.key
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {btn.label}
            <span className="ml-1.5 text-xs opacity-60">
              ({counts[btn.key]})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
