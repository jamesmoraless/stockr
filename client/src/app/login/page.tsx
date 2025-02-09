"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import PublicRoute from "@/components/publicroute";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Email/password login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const userCredentials = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUid = userCredentials.user.uid;
      console.log("User authenticated:", userCredentials);
      console.log("Firebase UID:", firebaseUid);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
      <PublicRoute>
        <div className="flex flex-col items-start justify-center pl-20 min-h-screen">
          <h1 className="text-[10rem] tracking-[-0.1em]">Sign In.</h1>
          <p className="mt-4 text-2xl tracking-[-0.08em]">
            Please login to continue to your account
          </p>
          <div>

            {error && <div className="text-red-500 text-l mb-4">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-l font-medium">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-[500px] p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-l font-medium">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-[500px] p-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
            >
              Sign In
            </button>
          </form>

          <p className="text-l text-gray-600 mt-4">
            <a href="/forgot-password" className="underline">
              Forgot password?
            </a>
          </p>

          </div>
        </div>


        {/*
under second button           <button
            onClick={handleGoogleLogin}
            className="w-full py-2 mt-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
          >
            Sign in with Google
          </button>

      */}


      </PublicRoute>
  );
}
