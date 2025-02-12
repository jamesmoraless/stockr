import React, { useState, FC } from "react";
import { getAuth } from "firebase/auth";
import { XCircleIcon } from "@heroicons/react/24/outline";

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

const PurchaseAssetModal: FC<PurchaseAssetModalProps> = ({ onClose, onAssetAdded, portfolioId }) => {
  const [ticker, setTicker] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Function to validate ticker input (Only allows A-Z, a-z)
  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z]*$/.test(value)) {
      setTicker(value);
    }
  };

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/${portfolioId}/add-asset`, {
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
      });

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
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XCircleIcon className="h-6 w-6" />
        </button>

        <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">Purchase Asset</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Asset Symbol</label>
            <input
              type="text"
              value={ticker}
              onChange={handleTickerChange}
              placeholder="e.g., AAPL"
              maxLength={9}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Shares</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 100"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Price per Share</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 150"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
            >
              {loading ? "Processing..." : "Purchase Asset"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseAssetModal;
