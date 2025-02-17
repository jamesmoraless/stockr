"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import ProtectedRoute from "@/components/protectedroute";
import TransactionsTable from "@/components/TransactionsTable";

export default function TransactionsPage() {
  const [user, setUser] = useState<null | any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
      <ProtectedRoute>

        <div className="flex flex-col items-start justify-center pl-20 min-h-screen">
          {/* Header Section */}
          <header className="w-full">
            <h1 className="text-[10rem] tracking-[-0.1em] -ml-4">Transactions.</h1>
            <div className="flex justify-between items-center">
              <p className="text-2xl tracking-[-0.08em] flex-1 max-w-2xl">
                Transaction History (Last 15 Days)
              </p>
            </div>
          </header>
          <TransactionsTable/>
        </div>
      </ProtectedRoute>
);
}
