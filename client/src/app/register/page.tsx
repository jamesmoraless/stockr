"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Registration successful! Please log in.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
      <div className="col-md-6">
        <h1>Register</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <form onSubmit={handleRegister}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-primary">Register</button>
        </form>
        <p className="mt-3">Already have an account? <a href="/login">Login</a></p>
      </div>
    </div>
  );
}
