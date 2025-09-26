import { useState, useRef, useEffect } from 'react';

export interface Place {
  place_id: string | null;
  description?: string;
  main_text?: string;
  secondary_text?: string;
  [key: string]: any;
}

interface UsePlacesSearchOptions {
  debounceMs?: number;
  minChars?: number;
  limit?: number;
  fetchUrl?: string; // defaults to `/api/places`
  onSubmit?: (place: Place) => void;
}

export function usePlacesSearch(options: UsePlacesSearchOptions = {}) {
  const {
    debounceMs = 220,
    minChars = 1,
    limit = 6,
    fetchUrl = '/api/places',
    onSubmit,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1); // for arrow navigation

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < minChars) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    setLoading(true);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(
        `${fetchUrl}?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
        {
          signal: controller.signal,
        },
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => setResults(data || []))
        .catch((err) => {
          if (err.name !== 'AbortError') setResults([]);
        })
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, debounceMs, minChars, limit, fetchUrl]);

  const onChange = (v: string) => {
    setQuery(v);
    setSelectedPlace(null);

    if (!v || v.trim().length === 0) {
      setResults([]);
      setIsOpen(true); // keep dropdown visible if user clicks input
      if (abortRef.current) abortRef.current.abort();
      setLoading(false);
    }
  };

  const onFocus = () => {
    setIsOpen(true);
    if (!query || query.trim().length === 0) setResults([]);
  };

  const onBlur = () => setTimeout(() => setIsOpen(false), 150);

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
    setQuery(place.description || place.main_text || '');
    setResults([]);
    setIsOpen(false);
    onSubmit?.(place);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const place =
        selectedPlace ??
        (highlightedIndex >= 0 ? results[highlightedIndex] : results[0]);
      if (place) selectPlace(place);
    }
  };

  return {
    query,
    results,
    loading,
    isOpen,
    selectedPlace,
    highlightedIndex,
    onChange,
    onFocus,
    onBlur,
    setQuery,
    handleKeyDown,
    setResults,
    setIsOpen,
    selectPlace,
  };
}
