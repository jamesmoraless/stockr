"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";
import PortfolioTable from "@/components/PortfolioTable";
import CashModal from "@/components/cashmodal";
import DoughnutGraph from "@/components/DoughnutGraph";


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


export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
  const [portfolioRefresh, setPortfolioRefresh] = useState<number>(0);
  const [DoughnutRefresh, setDoughnutRefresh] = useState<number>(0);
  const [cashBalance, setCashBalance] = useState<number>(0);

  // Set the authenticated user.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const onAddAssetClick = () => {
    setIsAssetModalOpen(true);
  };

  // Function to fetch cash balance from the backend.
  const fetchCashBalance = async () => {
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cash/balance`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      });
      if (!res.ok) {
        throw new Error("Failed to fetch cash balance");
      }
      const data = await res.json();
      setCashBalance(data.cash_balance);
    } catch (error: any) {
      console.error("Error fetching cash balance:", error);
    }
  };

  useEffect(() => {
    if (!user) return; 
    fetchCashBalance();
  }, [user, portfolioRefresh, DoughnutRefresh]);
  
  // Called when an asset is added, triggering a refresh.
  const handleAssetAdded = () => {
    setPortfolioRefresh((prev) => prev + 1);
    setDoughnutRefresh((prev) => prev + 1);

    fetchCashBalance();
  };

  return (
    <ProtectedRoute>
      <div className="chart-section">
        <h2 className="text-xl font-bold text-center mt-8">Portfolio Allocation</h2>
        <DoughnutGraph 
          refresh={DoughnutRefresh}
        />
      </div>
      <div className="min-h-screen relative">
        <header className="p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          {/* Cash Balance Button */}
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => setIsCashModalOpen(true)}
          >
            Cash: ${cashBalance.toFixed(2)}
          </button>
        </header>
        <main className="p-4">
          <PortfolioTable
            refresh={portfolioRefresh}
            />
        </main>
        {/* Add Asset button at the bottom */}
        <button
          className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white py-4 text-center"
          onClick={onAddAssetClick}
        >
          + Add Asset
        </button>
        {isAssetModalOpen && (
          <PurchaseAssetModal
            onClose={() => setIsAssetModalOpen(false)}
            onAssetAdded={handleAssetAdded}
          />
        )}
        {isCashModalOpen && (
          <CashModal
            onClose={() => setIsCashModalOpen(false)}
            updateCashBalance={(newBalance: number) => setCashBalance(newBalance)}
          />
        )}
      </div>
      <style jsx>{`
        button.fixed {
          z-index: 1001;
        }
      `}</style>
    </ProtectedRoute>
  );
}
