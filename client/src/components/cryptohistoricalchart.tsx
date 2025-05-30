"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// This function retrieves your Firebase ID token.
async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    console.log("User authenticated for chart fetch");
    return await user.getIdToken();
  }
  console.log("No authenticated user for chart fetch");
  return "";
}

interface HistoricalData {
  dates: string[];
  prices: string[];
}

interface CryptoHistoricalChartProps {
  symbol: string;
}

export default function CryptoHistoricalChart({ symbol }: CryptoHistoricalChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData>({ dates: [], prices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const token = await getFirebaseIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/crypto/historical/${symbol}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch crypto historical data");
        }
        const data = await res.json();
        setHistoricalData(data);
      } catch (error) {
        console.error("Error fetching crypto historical data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistoricalData();
  }, [symbol]);

  if (loading) {
    return <div>Loading crypto data...</div>;
  }

  const chartData = {
    labels: historicalData.dates,
    datasets: [
      {
        label: `${symbol} Historical Prices`,
        data: historicalData.prices,
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          parser: "yyyy-MM-dd",
          tooltipFormat: "PP",
          unit: "month" as const,
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: "Price (USD)",
        },
      },
    },
  };

  return (
    <div className="w-full h-96">
      <Line data={chartData} options={options} />
    </div>
  );
}
