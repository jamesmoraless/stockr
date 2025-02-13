import { getAuth } from "firebase/auth";
const API_URL = process.env.NEXT_PUBLIC_API_URL; // Ensure your environment variable is set

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

export async function searchAvailableStocks(searchInput: string) {
  try {
    const token = await getFirebaseIdToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stocks/${searchInput}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch ticker");
  } catch (error) {
    console.error("Error fetching stock search results:", error);
    return [];
  }
}
