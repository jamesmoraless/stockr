"use client";

import { useState } from "react";

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
            <h1 className="text-2xl tracking-[-0.04em -mt-1">Add a Stock</h1>
            <button
                className="w-10 h-10 flex items-center justify-center transition-all hover:bg-gray-200 -mt-3"
                onClick={onClose}
            >
        <span className="relative w-5 h-5 flex items-center justify-center">
          <span className="absolute w-[1.5px] h-5 bg-gray-500 rotate-45"></span>
          <span className="absolute w-[1.5px] h-5 bg-gray-500 -rotate-45"></span>
        </span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                  type="text"
                  placeholder="eg. AAPL"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full p-2 border text-gray-500 tracking-[-0.08em] flex-1 max-w-2xl rounded-md"
              />
            </div>

            <button type="submit" className="tracking-[-0.04em] w-full p-2 bg-black text-white rounded-md">
              Submit
            </button>
          </form>
        </div>
      </div>

  );
}
