"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface LocationResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search for a location...",
  id,
  name,
  required,
  disabled,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const API_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!inputValue || inputValue.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!API_KEY) {
        console.warn("LocationIQ API key not configured");
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(
            inputValue
          )}&limit=5&dedupe=1&format=json`
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        } else {
          console.error("LocationIQ API error:", response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [inputValue, API_KEY]);

  function handleSelect(result: LocationResult) {
    const locationName = result.display_name;
    setInputValue(locationName);
    onChange(locationName);
    setIsOpen(false);
    setResults([]);
  }

  function handleInputChange(newValue: string) {
    setInputValue(newValue);
    onChange(newValue);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        name={name}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-white/20 border-t-teal-500 rounded-full animate-spin" />
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/20 max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">📍</span>
                <span className="text-sm text-gray-300">{result.display_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!API_KEY && (
        <p className="text-xs text-yellow-500 mt-1">
          ⚠️ Location autocomplete disabled. Add NEXT_PUBLIC_LOCATIONIQ_API_KEY to .env
        </p>
      )}
    </div>
  );
}
