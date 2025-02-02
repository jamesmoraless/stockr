"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/firebase/config"; // Adjust if needed based on your tsconfig paths

export default function Navbar() {
  const [user, setUser] = useState<null | any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  if (user) {
    // Navbar for authenticated users
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link href="/" className="navbar-brand">
            Stockr
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarLoggedIn"
            aria-controls="navbarLoggedIn"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse justify-content-center" id="navbarLoggedIn">
            <ul className="navbar-nav mb-2 mb-lg-0">
              <li className="nav-item me-lg-3">
                <Link href="/" className="nav-link">
                  Home
                </Link>
              </li>
              <li className="nav-item me-lg-3">
                <Link href="/transactions" className="nav-link">
                  Transactions
                </Link>
              </li>
              <li className="nav-item me-lg-3">
                <Link href="/statistics" className="nav-link">
                  Statistics
                </Link>
              </li>
            </ul>
          </div>
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {user.displayName || user.email}
              </a>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                <li>
                  <a className="dropdown-item" href="#" onClick={() => signOut(auth)}>
                    Logout
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    );
  } else {
    // Navbar for users who are not logged in
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link href="/" className="navbar-brand">
            Stockr
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarLoggedOut"
            aria-controls="navbarLoggedOut"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse justify-content-end" id="navbarLoggedOut">
            <ul className="navbar-nav mb-2 mb-lg-0">
              <li className="nav-item me-lg-3">
                <Link href="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item me-lg-3">
                <Link href="/register" className="nav-link">
                  Register
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
}
