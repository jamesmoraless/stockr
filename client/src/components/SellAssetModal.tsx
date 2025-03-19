"use client";

import React, { useState, FC } from "react";
import { getAuth } from "firebase/auth";
import { XCircleIcon } from "@heroicons/react/24/outline";

interface SellAssetModalProps {
  onClose: () => void;
  onAssetSold: () => void;
  initialTicker: string;
  maxShares: number;
  portfolioId: string | null;
}

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe(); // Stop listening after the first change
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

const SellAssetModal: FC<SellAssetModalProps> = ({
  onClose,
  onAssetSold,
  initialTicker,
  maxShares,
  portfolioId,
}) => {
  const [shares, setShares] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!portfolioId) {
      setError("Portfolio not found.");
      return;
    }

    const numShares = parseFloat(shares);
    const numPrice = parseFloat(price);

    if (isNaN(numShares) || numShares <= 0 || numShares > maxShares) {
      setError(`Enter a valid number of shares (max: ${maxShares}).`);
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}/sell-asset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ticker: initialTicker.toUpperCase(),
            shares: numShares,
            price: numPrice,
            transaction_type: "sell",
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to sell asset");
      }

      onAssetSold();
      onClose();
    } catch (err: any) {
      setError(`Failed to sell asset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Use similar styling as AddStock: white background, padding, shadow, and a wide modal */}
      <div className="bg-white p-6 shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl tracking-[-0.04em]">Sell {initialTicker}</h1>
          <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center transition-all -mt-3"
              aria-label="Close modal">
            <span className="relative w-5 h-5 flex items-center justify-center">
              <i className="fas fa-times text-gray-400"></i>
            </span>
          </button>

        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-1">
            <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder={`Number of Shares (max: ${maxShares})`}
                aria-label="Number of Shares"
                className="w-full p-2 border text-gray-500 tracking-[-0.08em] rounded-md"
            />
          </div>
          <div className="mb-4">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price per Share"
              aria-label="Price per Share"
              step="0.01"
              className="w-full p-2 border text-gray-500 tracking-[-0.08em] rounded-md"
            />
          </div>
          {error && (
            <p className="text-center text-red-500 mb-4 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="tracking-[-0.04em] w-full p-2 bg-black text-white rounded-md"
          >
            {loading ? "Processing..." : `Sell ${initialTicker}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellAssetModal;
