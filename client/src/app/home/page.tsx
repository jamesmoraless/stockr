"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import ProtectedRoute from "@/components/protectedroute";
import PortfolioTable from "@/components/PortfolioTable";
import DoughnutGraph from "@/components/DoughnutGraph";
import PortfolioGrowthChart from "@/components/PortfolioGrowthChart";
import { Kaisei_HarunoUmi } from "next/font/google";

const kaisei = Kaisei_HarunoUmi({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

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
  const [refreshCounter, setRefreshCounter] = useState(0);

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

  // Callback to refresh all components after asset addition
  const handlePageRefresh = () => {
    setPortfolioRefresh((prev) => prev + 1);
    setDoughnutRefresh((prev) => prev + 1);
    setRefreshCounter((prev) => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col items-start justify-center pl-20 min-h-screen">
        <header className="w-full mb-8">
          {/* Charts Section - 50/50 split with fixed height */}
          <div className="flex mt-8 gap-8">
            {/* Left chart - Doughnut Graph */}
            <div className="w-1/2 h-[300px]">
              <DoughnutGraph refresh={doughnutRefresh} portfolioId={portfolioId} />
            </div>

            {/* Right chart - Growth Chart with fixed height */}
            <div className="w-1/2 h-[300px] overflow-hidden">
              <div className="h-full">
                <PortfolioGrowthChart refresh={refreshCounter} portfolioId={portfolioId} />
              </div>
            </div>
          </div>
        </header>

        {/* Portfolio Table Section */}
        <div className={`${kaisei.className} w-full tracking-[-0.08em]`}>
          <PortfolioTable
            refresh={portfolioRefresh}
            portfolioId={portfolioId}
            onAssetAdded={handlePageRefresh}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}