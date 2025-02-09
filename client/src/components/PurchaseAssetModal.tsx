import React, { useState, FC } from "react";
import { getAuth } from "firebase/auth";

interface PurchaseAssetModalProps {
  onClose: () => void;
  onAssetAdded?: () => void;
}

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe(); // stop listening after the first change
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

const PurchaseAssetModal: FC<PurchaseAssetModalProps> = ({ onClose, onAssetAdded }) => {
  const [ticker, setTicker] = useState<string>("");
  const [shares, setShares] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
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
    <div className="modal">
      <div className="modal-content">
        <h2>Purchase Asset</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Asset Symbol:
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., AAPL"
              aria-label="Asset Symbol"
            />
          </label>
          <label>
            Number of Shares:
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 100"
              aria-label="Number of Shares"
            />
          </label>
          <label>
            Price per Share:
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 150"
              aria-label="Price per Share"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="buttons">
            <button type="submit" disabled={loading} className="purchase-btn">
              {loading ? "Processing..." : "Purchase Asset"}
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        h2 {
          margin-bottom: 1rem;
          text-align: center;
        }
        form {
          display: flex;
          flex-direction: column;
        }
        label {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          font-weight: 500;
        }
        input {
          padding: 0.5rem;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-top: 0.25rem;
        }
        .error {
          color: red;
          margin-bottom: 1rem;
          text-align: center;
        }
        .buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
        }
        .purchase-btn {
          background-color: #28a745;
          color: #fff;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .cancel-btn {
          background-color: #ccc;
          color: #000;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .purchase-btn:hover {
          background-color: #218838;
        }
        .cancel-btn:hover {
          background-color: #999;
        }
      `}</style>
    </div>
  );
};

export default PurchaseAssetModal;
