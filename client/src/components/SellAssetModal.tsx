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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        {/* Modal Header with Close Icon at Top Right */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sell Asset</h2>
          <button onClick={onClose} aria-label="Close modal">
            <XCircleIcon className="w-6 h-6 text-gray-500 hover:text-red-500" />
          </button>
        </div>

        <p className="text-center text-gray-600 mb-4">
          Selling <strong>{initialTicker}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Shares:
            </label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 10"
              aria-label="Number of Shares"
              min="1"
              max={maxShares}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price per Share:
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 150"
              aria-label="Price per Share"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          {error && <p className="text-center text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
            >
              {loading ? "Processing..." : `Sell ${initialTicker}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellAssetModal;
