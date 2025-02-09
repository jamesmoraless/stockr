"use client";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config"; 
import ProtectedRoute from "@/components/protectedroute";
import CashModal from "@/components/cashmodal";

// This function retrieves your Firebase ID token. Adjust according to your Firebase auth logic.
async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    console.log('User authenticated');
    return await user.getIdToken();
  }
  console.log('No authenticated user');
  return "";
}


export default function HomePage() {
  const [user, setUser] = useState<null | any>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);


  
  // Set the authenticated user.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch the user's cash balance from the backend using fetch.
  useEffect(() => {
    const fetchCashBalance = async () => {
      try {
        const token = await getFirebaseIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cash/balance`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }});
        if (!res.ok) {
          throw new Error("Failed to fetch cash balance");
        }
        const data = await res.json();
        setCashBalance(data.cash_balance);
      } catch (error) {
        console.error("Failed to fetch cash balance:", error);
      }
    };

    fetchCashBalance();
  }, []);

  return (
    <ProtectedRoute>
      <div className="relative min-h-screen">
        {/* Header with the cash balance button */}
        <header className="absolute top-0 right-0 p-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => setShowModal(true)}
          >
            Cash: ${cashBalance.toFixed(2)}
          </button>
        </header>
        {/* Main content */}
        <div className="flex items-center justify-center h-screen">
          <h1 className="text-2xl font-bold">HOME finances</h1>
        </div>
        {/* Cash Modal */}
        {showModal && (
          <CashModal
            onClose={() => setShowModal(false)}
            updateCashBalance={(newBalance: number) => setCashBalance(newBalance)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
