import React, { useState, FC } from 'react';
import { getAuth } from "firebase/auth";



interface CashModalProps {
  onClose: () => void;
  updateCashBalance: (balance: number) => void;
}

// This function retrieves your Firebase ID token. Adjust according to your Firebase auth logic.
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
  

const CashModal: FC<CashModalProps> = ({ onClose, updateCashBalance }) => {
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    try {
        const token = await getFirebaseIdToken();
        const endpoint = action === 'deposit' ? '/api/cash/deposit' : '/api/cash/withdraw';
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        body: JSON.stringify({ amount: parsedAmount })
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await res.json();
      updateCashBalance(data.cash_balance);
      onClose();
    } catch (error: any) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>{action === 'deposit' ? 'Deposit Cash' : 'Withdraw Cash'}</h3>
        <div className="action-buttons">
          <button onClick={() => setAction('deposit')} disabled={action === 'deposit'}>
            Deposit
          </button>
          <button onClick={() => setAction('withdraw')} disabled={action === 'withdraw'}>
            Withdraw
          </button>
        </div>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="amount-input"
        />
        <div className="modal-actions">
          <button onClick={handleSubmit} className="done-btn">
            Done
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
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
          padding: 2.5rem;
          border-radius: 10px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        h3 {
          margin-bottom: 1.5rem;
          font-size: 1.75rem;
          text-align: center;
          color: #333;
        }
        .action-buttons {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .action-buttons button {
          margin: 0 0.5rem;
          padding: 0.5rem 1.5rem;
          font-size: 1rem;
          border: 1px solid #ccc;
          background-color: #f7f7f7;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .action-buttons button:hover:not(:disabled) {
          background-color: #eaeaea;
        }
        .action-buttons button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .amount-input {
          display: block;
          width: 100%;
          padding: 0.75rem;
          font-size: 1.125rem;
          border: 1px solid #ccc;
          border-radius: 5px;
          margin-bottom: 1.5rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .amount-input:focus {
          border-color: #0070f3;
        }
        .modal-actions {
          display: flex;
          justify-content: center;
        }
        .modal-actions button {
          margin: 0 0.5rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .done-btn {
          background-color: #28a745; /* green */
          color: #fff;
        }
        .done-btn:hover {
          background-color: #218838;
        }
        .cancel-btn {
          background-color: #dc3545; /* red */
          color: #fff;
        }
        .cancel-btn:hover {
          background-color: #c82333;
        }
      `}</style>
    </div>
  );
};

export default CashModal;
