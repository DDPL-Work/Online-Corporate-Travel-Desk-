import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * useLocationIntelligence
 * A custom hook for city-restricted locality search using OpenStreetMap (Nominatim)
 * Features: Debouncing, Caching, City-Restricted searching, and Error handling.
 */
export const useLocationIntelligence = (cityName = '', minChars = 2) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Simple in-memory cache for the current session
  const cache = useRef({});

  const search = useCallback(async (searchQuery) => {
    const q = searchQuery.trim();
    if (q.length < minChars) {
      setResults([]);
      return;
    }

    // Check cache first
    const cacheKey = `${cityName}:${q}`.toLowerCase();
    if (cache.current[cacheKey]) {
      setResults(cache.current[cacheKey]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct localized query
      const localizedQuery = cityName ? `${q}, ${cityName}` : q;
      
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: localizedQuery,
          format: 'json',
          limit: 8,
          addressdetails: 1,
          featuretype: 'settlement,suburb,city_district,neighbourhood,road,poi'
        }
      });

      const formattedResults = response.data.map(item => ({
        id: item.place_id,
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        importance: item.importance
      }));

      // Sort by importance if available
      formattedResults.sort((a, b) => b.importance - a.importance);

      // Save to cache
      cache.current[cacheKey] = formattedResults;
      setResults(formattedResults);
    } catch (err) {
      console.error('Location search failed:', err);
      setError('Search service temporarily unavailable');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [cityName, minChars]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query, search]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearResults: () => setResults([])
  };
};
