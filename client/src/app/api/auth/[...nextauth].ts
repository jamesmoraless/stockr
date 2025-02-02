// client/src/app/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Export the NextAuth configuration
export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // You can add additional providers here
  ],
  // Optional: Add callbacks to customize session or JWT behavior
  callbacks: {
    async session({ session, token, user }) {
      // For example, you could add additional properties to the session object here
      return session;
    },
  },
});
