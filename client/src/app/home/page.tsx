"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";
import PortfolioTable from "@/components/PortfolioTable";
import DoughnutGraph from "@/components/DoughnutGraph";

async function getFirebaseIdToken(): Promise<string | null> {
  const auth = getAuth();
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve(null);
      }
    });
  });
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [portfolioRefresh, setPortfolioRefresh] = useState<number>(0);
  const [doughnutRefresh, setDoughnutRefresh] = useState<number>(0);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  // Fetch portfolio ID when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && !portfolioId) {
        fetchPortfolioId();
      }
    });

    return () => unsubscribe();
  }, []); // Runs only once when component mounts

  const fetchPortfolioId = async () => {
    try {
      const token = await getFirebaseIdToken();
      if (!token) {
        console.error("User not authenticated.");
        return;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/id`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      });
      if (!res.ok) {
        throw new Error("Failed to fetch portfolio ID");
      }
      const data = await res.json();
      setPortfolioId(data.portfolio_id);
    } catch (error: any) {
      console.error("Error fetching portfolio ID:", error);
    }
  };

  // Refresh Portfolio Table & Doughnut Graph after adding an asset
  const handlePageRefresh = () => {
    setPortfolioRefresh((prev) => prev + 1);
    setDoughnutRefresh((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="chart-section">
        <h2 className="text-xl font-bold text-center mt-8">Portfolio Allocation</h2>
        <DoughnutGraph refresh={doughnutRefresh} portfolioId={portfolioId} />
      </div>

      <div className="min-h-screen relative">
        <main className="p-4">
          <PortfolioTable refresh={portfolioRefresh} portfolioId={portfolioId} />
        </main>

        {/* Add Asset Button */}
        <section className="section is-small pt-0">
        <button
          className="add-asset-button"
          onClick={(e) => {
            e.stopPropagation(); // Prevents event bubbling
            setIsAssetModalOpen(true);
          }}
        >
          + Add Asset
        </button>
        </section>

        {/* Asset Purchase Modal */}
        {isAssetModalOpen && portfolioId && (
          <PurchaseAssetModal
            onClose={() => {
              console.log("Closing Asset Modal...");
              setIsAssetModalOpen(false);
            }}
            onAssetAdded={handlePageRefresh}
            portfolioId={portfolioId}
          />
        )}
      </div>

      <style jsx>{`
        .add-asset-button {
          width: 100%;
          background-color: #f5f5f5; /* Light grey to match table header */
          color: #333; /* Darker text for contrast */
          padding: 12px 0;
          font-size: 1rem;
          font-weight: bold;
          border: none;
          border-radius: 5px;
          margin-top: 5px;
          margin-bottom: 5px;
          text-align: center;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .add-asset-button:hover {
          background-color: #e0e0e0; /* Slightly darker on hover */
        }

        .add-asset-button:active {
          background-color: #d6d6d6; /* Even darker when clicked */
        }
      `}</style>
    </ProtectedRoute>
  );
}
