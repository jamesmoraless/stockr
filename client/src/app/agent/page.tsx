"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import ProtectedRoute from "@/components/protectedroute";
import { Kaisei_HarunoUmi } from "next/font/google";

const kaisei = Kaisei_HarunoUmi({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function AgentPage() {
  const [user, setUser] = useState<null | any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <div>
        <div className="flex flex-col items-start justify-center pl-20 min-h-screen">
          {/* Header Section */}
          <header className="w-full">
            <h1 className="text-[10rem] tracking-[-0.1em] -ml-4">Agent.</h1>
            <div className="flex justify-between items-center">
              <p className="text-2xl tracking-[-0.08em] flex-1">
                The modern way to invest, providing unique insights on your personalized portfolio.
              </p>
            </div>
          </header>

          {/* Content Section - Adding this structure makes the layout match transactions */}
          <div className={`${kaisei.className} w-full tracking-[-0.08em]`}>
            <div className="mt-6 h-[400px] overflow-y-auto">
              {/* Your agent chat interface or content will go here */}
                <div className="p-4 text-center">

                    <div className="w-full max-w-lg">
                        <input type="text" placeholder="What can I help you with today?"
                               className="w-full p-4 border border-gray-300 rounded-lg"/>
                    </div>

                </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}