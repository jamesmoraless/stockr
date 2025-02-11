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
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Transactions</h1>
        <TransactionsTable />
      </div>
    </ProtectedRoute>
  );
}
