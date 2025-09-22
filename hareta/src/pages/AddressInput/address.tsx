import React, { useEffect, useRef, useState } from 'react';

// Default export React component for Vite + React + Tailwind projects
// Features:
// - Debounced address input
// - Calls GET /api/places?q=... and shows results
// - Keyboard navigation (ArrowUp/Down, Enter, Esc)
// - Shows lat/lng when present from DB results
// - Minimal, accessible markup and Tailwind styling

export default function AddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<any | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimer = useRef<number | null>(null);

  // Basic fetch to /api/places?q=... (no API key on frontend)
  async function fetchPlaces(q: string) {
    if (!q || q.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/places?q=${encodeURIComponent(q)}&limit=8`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResults(json || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err: any) {
      setError(err?.message || 'fetch failed');
      setResults([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }

  // Debounce input
  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    // tiny debounce: 250ms
    debounceTimer.current = window.setTimeout(() => {
      if (query.trim().length > 0) fetchPlaces(query.trim());
      else {
        setResults([]);
        setIsOpen(false);
      }
    }, 250);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        choose(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }

  function choose(item: any) {
    setChosen(item);
    setQuery(
      item.main_text + (item.secondary_text ? `, ${item.secondary_text}` : ''),
    );
    setIsOpen(false);
    setSelectedIndex(-1);
  }

  function clearChoice() {
    setChosen(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div className='mx-auto max-w-xl p-4' ref={containerRef}>
      <label
        htmlFor='address'
        className='mb-2 block text-sm font-medium text-gray-700'
      >
        Address
      </label>
      <div className='relative'>
        <input
          id='address'
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder='Start typing an address or place'
          className='w-full rounded-xl border p-3 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none'
          aria-autocomplete='list'
          aria-controls='places-listbox'
          aria-expanded={isOpen}
        />

        {loading && (
          <div className='absolute top-3 right-3 text-xs text-gray-500'>
            Loading…
          </div>
        )}

        {query && (
          <button
            type='button'
            onClick={clearChoice}
            className='absolute right-3 bottom-3 text-xs text-gray-500'
            aria-label='Clear'
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          id='places-listbox'
          role='listbox'
          className='mt-2 max-h-64 overflow-auto rounded-xl border bg-white shadow'
        >
          {results.map((r, idx) => (
            <li
              key={r.id ?? r.place_id ?? idx}
              role='option'
              aria-selected={selectedIndex === idx}
              onMouseDown={(e) => {
                // mouseDown so input doesn't lose focus before click
                e.preventDefault();
                choose(r);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`cursor-pointer p-3 hover:bg-gray-50 ${
                selectedIndex === idx ? 'bg-gray-100' : ''
              }`}
            >
              <div className='text-sm font-medium'>{r.main_text}</div>
              {r.secondary_text && (
                <div className='text-xs text-gray-500'>{r.secondary_text}</div>
              )}
              <div className='mt-1 text-xs text-gray-400'>
                <span>{r.source}</span>
                {r.lat && r.lng && (
                  <span>{` • lat: ${Number(r.lat).toFixed(6)}, lng: ${Number(
                    r.lng,
                  ).toFixed(6)}`}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results / error */}
      {isOpen && !loading && results.length === 0 && (
        <div className='mt-2 rounded-xl border p-3 text-sm text-gray-500'>
          No results
        </div>
      )}

      {error && <div className='mt-2 text-sm text-red-600'>{error}</div>}

      {/* Chosen details + next-step placeholders */}
      {chosen && (
        <div className='mt-4 rounded-xl border bg-gray-50 p-4'>
          <div className='text-sm font-semibold'>Selected place</div>
          <div className='mt-1 text-sm'>{chosen.main_text}</div>
          {chosen.secondary_text && (
            <div className='text-xs text-gray-600'>{chosen.secondary_text}</div>
          )}
          {chosen.lat && chosen.lng ? (
            <div className='mt-2 text-xs text-gray-600'>
              Coordinates: {Number(chosen.lat).toFixed(6)},{' '}
              {Number(chosen.lng).toFixed(6)}
            </div>
          ) : (
            <div className='mt-2 text-xs text-gray-600'>
              Coordinates not available (Google fallback prediction)
            </div>
          )}

          {/* Placeholder: the "couple of questions" form the user mentioned can be placed here later */}
          <div className='mt-4 text-sm text-gray-700'>
            Next: I'll add the follow-up form fields you mentioned. Tell me
            which questions you want here and I'll wire them up under this
            selected place.
          </div>
        </div>
      )}
    </div>
  );
}
