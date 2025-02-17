import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";

interface SearchBarProps {
  onSymbolSelect: (symbol: string) => void;
}

interface SearchResult {
  symbol: string;
  name: string;
}
async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

const SearchBar: React.FC<SearchBarProps> = ({ onSymbolSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch stocks from Yahoo Finance endpoint
  const fetchStocks = async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }

    try {
        const token = await getFirebaseIdToken();
      // Fetch stocks from backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/${query}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stock data");

      const data = await response.json();
      setResults(data.stocks || []);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      setResults([]);
    }
  };

  // Handle input changes with debounce to reduce API calls
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (searchTerm.length > 1) {
        fetchStocks(searchTerm);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [searchTerm]);

  // Handle selection
  const handleSelect = (symbol: string) => {
    setSearchTerm(symbol);
    setIsDropdownOpen(false);
    onSymbolSelect(symbol); // Pass the selected symbol to parent
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
      <div className="relative w-full">
        <input
            type="text"
            placeholder="eg. AAPL"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-500 tracking-[-0.08em]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isDropdownOpen && results.length > 0 && (
            <div ref={dropdownRef}
                 className="absolute w-full bg-white border border-gray-300 rounded-md z-10">
              {results.map((stock, index) => (
                  <button
                      key={index}
                      onClick={() => handleSelect(stock.symbol)}
                      className="block w-full text-left p-2 hover:bg-gray-100"
                  >
                    {stock.symbol} - {stock.name}
                  </button>
              ))}
            </div>
        )}
      </div>

  );
};

export default SearchBar;
