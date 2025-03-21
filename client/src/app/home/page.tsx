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
      <div className="flex flex-col items-start pl-20 min-h-screen pt-24">
        <div className="w-full grid grid-cols-5 mb-4">
          {/* Left chart - Growth Chart (60%) */}
          <div className="col-span-3 bg-white overflow-hidden h-[300px]">
            <PortfolioGrowthChart refresh={refreshCounter} portfolioId={portfolioId}/>
          </div>

          {/* Right chart - Doughnut Graph (40%) */}
          <div className="col-span-2 bg-white overflow-hidden h-[300px]">
            <DoughnutGraph refresh={doughnutRefresh} portfolioId={portfolioId}/>
          </div>
        </div>

        {/* Portfolio Table Section */}
        <div className={`${kaisei.className} w-11/12 tracking-[-0.08em] bg-white`}>
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