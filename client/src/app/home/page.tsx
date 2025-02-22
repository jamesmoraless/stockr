"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/id`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch portfolio ID");
      }
      const data = await res.json();
      setPortfolioId(data.portfolio_id);
    } catch (error: any) {
      console.error("Error fetching portfolio ID:", error);
    }
  };

  // Callback to refresh both portfolio table and doughnut graph after asset addition
  const handlePageRefresh = () => {
    setPortfolioRefresh((prev) => prev + 1);
    setDoughnutRefresh((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center">
        <div className="flex flex-row gap-4 w-full">
          {/* Left Half - Doughnut Chart (30%) */}
          <div className="w-[23%] p-4">
            <DoughnutGraph refresh={doughnutRefresh} portfolioId={portfolioId} />
          </div>

          {/* Right Half - Portfolio Table (70%) */}
          <div className="w-[77%] relative -mt-[75px]">
            <main className="p-4">
              <PortfolioTable
                refresh={portfolioRefresh}
                portfolioId={portfolioId}
                onAssetAdded={handlePageRefresh}
              />
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
