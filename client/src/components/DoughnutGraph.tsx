import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { getAuth } from "firebase/auth";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutEntryProps {
  refresh: number;
  portfolioId: string | null;
}

interface PortfolioEntry {
  ticker: string;
  book_value: number;
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

const DoughnutGraph: React.FC<DoughnutEntryProps> = ({ refresh, portfolioId }) => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!portfolioId) return;

    const fetchPortfolioData = async () => {
      try {
        setLoading(true);
        setError("");

        const token = await getFirebaseIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/graph/${portfolioId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch portfolio data");
        }

        const data = await response.json();
        setPortfolio(data.portfolio || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [refresh, portfolioId]);

  if (!portfolioId) return <p>Loading portfolio...</p>;
  if (loading) return <p>Loading chart...</p>;
  if (error) return <p>Error: {error}</p>;
  if (portfolio.length === 0) return <p>No assets in portfolio to display.</p>;

  const sumOfAllAssetValues = portfolio.reduce((total, asset) => total + asset.book_value, 0);

  const data = {
    labels: portfolio.map((asset) => asset.ticker),
    datasets: [
      {
        data: portfolio.map((asset) => asset.book_value),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const percentage = ((value / sumOfAllAssetValues) * 100).toFixed(2);
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      legend: {
        display: true,
        position: "bottom" as const,
      },
    },
    maintainAspectRatio: false,
    cutout: "40%", // Adjusts the thickness of the doughnut
  };

  return (
    <div className="doughnut-container">
      <h2 className="total-value">Total Portfolio Value: ${sumOfAllAssetValues.toLocaleString()}</h2>
      <div className="doughnut-wrapper">
        <Doughnut data={data} options={options} />
      </div>
      <style jsx>{`
        .doughnut-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 500px; /* Increased max width */
          margin: auto;
          padding: 20px;
        }

        .total-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }

        .doughnut-wrapper {
          width: 100%;
          height: 300px; /* Increased height */
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default DoughnutGraph;
