"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config"; // Adjust your alias or relative path if needed
import ProtectedRoute from "@/components/protectedroute";

export default function FinvizPage() {
  const [user, setUser] = useState<null | any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
      <ProtectedRoute>
      <div className="flex items-start justify-center h-screen pt-60">
          <h1 className="text-2xl font-bold"> TRANSACTIONS
              finances </h1>
      </div>
      </ProtectedRoute>
  );
}