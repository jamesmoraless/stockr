"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/firebase/config"; // Adjust the path as needed
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<null | any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

    const getUserName = (email: string): string => {
    if (!email) return "";
    const name = email.split("@")[0];
    return name.toLowerCase();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  if (user) {
    // Navbar for authenticated users
    return (
      <nav className="bg-black text-white flex justify-between items-center p-4">
        {/* Brand */}
        <Link href="/" className="text-5xl font-playfair tracking-[-0.1em]">
          Stockr
        </Link>

        {/* Navigation links */}
        <div className="flex space-x-4">
          <Link href="/home" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            Home
          </Link>
          <Link href="/watchlist" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            Watchlist
          </Link>
          <Link href="/transactions" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            Transactions
          </Link>
          <Link href="/statistics" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            default2
          </Link>
                  {/* User dropdown */}



        <div className="relative text-3xl font-light hover:underline tracking-[-0.08em]">
          <button onClick={toggleDropdown} className="text-3xl hover:underline focus:outline-none">
            {user.displayName || getUserName(user.email)}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white text-black shadow-lg">
              <a
                href="#"
                onClick={handleLogout}
                className="block px-4 py-2 hover:bg-gray-200"
              >
                Logout
              </a>
            </div>
          )}
        </div>


        </div>
      </nav>
    );
  } else {
    // Navbar for users who are not logged in
    return (
      <nav className="bg-black text-white flex justify-between font items-center p-4">
        {/* Brand */}
        <Link href="/" className="text-5xl font-playfair tracking-[-0.1em]">
          Stockr
        </Link>

        {/* Login/Register links */}
        <div className="space-x-4">
          <Link href="/login" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            Login
          </Link>
          <Link href="/register" className="text-3xl font-light hover:underline tracking-[-0.08em]">
            Register
          </Link>
        </div>
      </nav>
    );
  }
}
