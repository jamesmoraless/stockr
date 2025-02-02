"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [message, setMessage] = useState("");

useEffect(() => {
  fetch("http://localhost:5001/")
    .then((res) => res.json())
    .then((data) => setMessage(data.message))
    .catch((err) => console.error("Error fetching data:", err));
}, []);

  return (
    <div className="flex items-start justify-center h-screen pt-60">
      <h1 className="text-2xl font-bold"> Stockr: A new way to check current market trends and personal finances </h1>
    </div>
  );
}
