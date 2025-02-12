"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
import PurchaseAssetModal from "@/components/PurchaseAssetModal";
import PortfolioTable from "@/components/PortfolioTable";
import DoughnutGraph from "@/components/DoughnutGraph";

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [portfolioRefresh, setPortfolioRefresh] = useState<number>(0);
  const [doughnutRefresh, setDoughnutRefresh] = useState<number>(0);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  // Set authenticated user & fetch portfolio ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchPortfolioId();
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch portfolio ID associated with the user
  const fetchPortfolioId = async () => {
    try {
      const token = await getFirebaseIdToken();
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

  // Method to refresh both Portfolio Table and Doughnut Graph
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
        <section className="section is-small pt-0">
          <button
            className="add-asset-button"
            onClick={() => setIsAssetModalOpen(true)}
          >
            + Add Asset
          </button>
        </section>
        
        {/* Asset Purchase Modal */}
        {isAssetModalOpen && (
          <PurchaseAssetModal
            onClose={() => setIsAssetModalOpen(false)}
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
