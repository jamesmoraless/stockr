"use client";

import React, { useState, FC, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { XCircleIcon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";  // Importing the SearchBar component

interface PurchaseAssetModalProps {
  onClose: () => void;
  onAssetAdded?: () => void;
  portfolioId: string | null;
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

const PurchaseAssetModal: FC<PurchaseAssetModalProps> = ({
  onClose,
  onAssetAdded,
  portfolioId,
}) => {
  const [ticker, setTicker] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [marketPrice, setMarketPrice] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSymbolSelect = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
  };

  // Fetch market price based on the selected ticker symbol
  useEffect(() => {
    if (!ticker.trim()) {
      setMarketPrice(null);
      return;
    }

    const fetchMarketPrice = async () => {
      try {
        const token = await getFirebaseIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stock/current/${ticker}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch market price");
        }

        const data = await response.json();
        setMarketPrice(data.market_price ? `$${data.market_price}` : "Unavailable");
      } catch (err) {
        console.error("Error fetching market price:", err);
        setMarketPrice("Unavailable");
      }
    };

    fetchMarketPrice();
  }, [ticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!portfolioId) {
      setError("Portfolio not found.");
      return;
    }

    if (!ticker.trim() || !shares.trim() || !price.trim()) {
      setError("All fields are required.");
      return;
    }

    const numShares = parseFloat(shares);
    const numPrice = parseFloat(price);
    if (isNaN(numShares) || numShares <= 0) {
      setError("Enter a valid number for shares.");
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Enter a valid price.");
      return;
    }

    setLoading(true);
    try {
      const token = await getFirebaseIdToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}/add-asset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticker,
            shares: numShares,
            price: numPrice,
            transaction_type: "buy",
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add asset");
      }
      if (onAssetAdded) {
        onAssetAdded();
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Modal container styled similarly to AddStock */}
      <div className="bg-white p-6 shadow-lg w-full max-w-2xl relative">



        {/* Modal header */}
        <div className="flex justify-between items-start">
          <h1 className="text-2xl tracking-[-0.04em]">Purchase Asset</h1>
          <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center transition-all -mt-3"
              aria-label="Close modal">
            <span className="relative w-5 h-5 flex items-center justify-center">
              <i className="fas fa-times text-gray-400"></i>
            </span>
          </button>
        </div>



        {/* Integrated SearchBar for asset symbol */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Symbol
          </label>
          <SearchBar onSymbolSelect={handleSymbolSelect}/>
        </div>



        {/* Market Price Field */}
        <div className="mt-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Market Price:
          </label>
          <input
            type="text"
            value={marketPrice || ""}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md text-gray-500 tracking-[-0.08em]"
          />
        </div>



        {/* Shares Field */}
        <div className="mt-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Shares
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="eg. 100"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-500 tracking-[-0.08em]"
          />
        </div>

        {/* Price Field */}
        <div className="mt-1 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price per Share
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="eg. 150"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-500 tracking-[-0.08em]"
          />
        </div>

        {error && <p className="text-center text-red-500 text-sm mt-4">{error}</p>}

        {/* Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full p-2 bg-black text-white rounded-md tracking-[-0.04em] transition-all hover:bg-black/90"
          >
            {loading ? "Processing..." : "Purchase Asset"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAssetModal;