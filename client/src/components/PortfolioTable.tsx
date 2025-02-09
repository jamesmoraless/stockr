import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";

interface PortfolioEntry {
  ticker: string;
  shares: number;
  average_cost: number;
  book_value: number;
  market_value: number;
  portfolio_percentage: number; // New field for Portfolio %
}

interface PortfolioTableProps {
  refresh: number;
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

const PortfolioTable: React.FC<PortfolioTableProps> = ({ refresh }) => {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      setError("");
      try {
        const token = await getFirebaseIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch portfolio");
        }

        const data = await res.json();
        const portfolioWithPercentage = calculatePortfolioPercentage(data.portfolio);
        setPortfolio(portfolioWithPercentage || []);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [refresh]);

  const calculatePortfolioPercentage = (portfolio: PortfolioEntry[]): PortfolioEntry[] => {
    const totalMarketValue = portfolio.reduce((acc, entry) => acc + entry.market_value, 0);
    return portfolio.map((entry) => ({
      ...entry,
      portfolio_percentage: (entry.market_value / totalMarketValue) * 100,
    }));
  };

  if (loading) return <p>Loading portfolio...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;
  if (portfolio.length === 0) return <p>No assets in portfolio.</p>;

  return (
    <div className="portfolio-table">
      <h2>Your Portfolio</h2>
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Shares</th>
            <th>Avg. Cost</th>
            <th>Book Value</th>
            <th>Market Value</th>
            <th>Portfolio %</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((entry, index) => (
            <tr key={index}>
              <td>{entry.ticker}</td>
              <td>{entry.shares}</td>
              <td>${entry.average_cost.toFixed(2)}</td>
              <td>${entry.book_value.toFixed(2)}</td>
              <td>${entry.market_value.toFixed(2)}</td>
              <td>
                <div className="portfolio-percentage-bar">
                  <div className="percentage-bar">
                    <span
                      style={{
                        width: `40%`,
                        backgroundColor:
                          entry.portfolio_percentage > 50 ? "#ff6b6b" : "#ffa726",
                      }}
                    ></span>
                  </div>
                  {/* <span className="percentage-label">
                    {entry.portfolio_percentage.toFixed(2)}%
                  </span> */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        .portfolio-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 16px;
          text-align: left;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .portfolio-table thead {
          background-color: #f9f9f9;
          font-weight: bold;
        }

        .portfolio-table th,
        .portfolio-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #f1f1f1;
        }

        .portfolio-table tbody tr:hover {
          background-color: #f8f8f8;
        }

        .portfolio-percentage-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .percentage-bar {
          background-color: #e1e1e1;
          height: 8px;
          border-radius: 5px;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .percentage-bar span {
          display: block;
          height: 100%;
          border-radius: 5px;
        }

        .percentage-label {
          font-size: 14px;
          color: #666;
        }

        .error-text {
          color: red;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default PortfolioTable;
