"use client";

import React, { useState } from "react";
import SearchBar from "@/components/SearchBar";

interface AddStockProps {
  onClose: () => void;
  onSubmit: (ticker: string) => void;
}

export default function AddStock({ onClose, onSubmit }: AddStockProps) {
  const [ticker, setTicker] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(ticker);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-start">
          <h1 className="text-2xl tracking-[-0.04em] -mt-1">Add a Stock</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-all -mt-3"
            aria-label="Close modal"
          >
            <span className="relative w-5 h-5 flex items-center justify-center">
              <i className="fas fa-times text-gray-400"></i>
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 mt-4">
            {/* Use the SearchBar component and update ticker when a symbol is selected */}
            <SearchBar onSymbolSelect={(symbol) => setTicker(symbol)} />
          </div>

          <button
            type="submit"
            className="tracking-[-0.04em] w-full p-2 bg-black text-white rounded-md"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
