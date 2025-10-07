import { useState, useRef, useEffect } from 'react';
import axios, { AxiosError, type CancelTokenSource } from 'axios';

export interface Place {
  place_id: string | null;
  id?: number;
  main_text: string;
  secondary_text?: string;
  lat?: number | null;
  lng?: number | null;
  [key: string]: any;
}

interface UsePlacesSearchOptions {
  debounceMs?: number;
  minChars?: number;
  limit?: number;
  fetchUrl?: string; // defaults to `/api/places`
  onSubmit?: (place: Place) => void;
  sessionToken?: string; // Add this
}

export function usePlacesSearch(options: UsePlacesSearchOptions = {}) {
  const {
    debounceMs = 220,
    minChars = 1,
    limit = 6,
    fetchUrl = '/api/places',
    onSubmit,
    sessionToken,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const debounceRef = useRef<number | null>(null);
  const cancelRef = useRef<CancelTokenSource | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < minChars) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      if (cancelRef.current) cancelRef.current.cancel();
      return;
    }

    setLoading(true);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      if (cancelRef.current) cancelRef.current.cancel();
      cancelRef.current = axios.CancelToken.source();

      try {
        const { data } = await axios.get(fetchUrl, {
          params: { q: query.trim(), limit, sessionToken },
          cancelToken: cancelRef.current.token,
        });
        setResults(data || []);
      } catch (error) {
        const err = error as AxiosError;
        if (!axios.isCancel(err)) {
          console.error('Places search error:', err.message);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (cancelRef.current) cancelRef.current.cancel();
    };
  }, [query, debounceMs, minChars, limit, fetchUrl, sessionToken]);

  const onChange = (v: string) => {
    setQuery(v);
    setSelectedPlace(null);

    if (!v || v.trim().length === 0) {
      setResults([]);
      setIsOpen(true);
      if (cancelRef.current) cancelRef.current.cancel();
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
