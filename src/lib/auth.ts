import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  callbacks: {
    authorized: async ({ auth }) => {
      // Only require auth for admin routes (event creation)
      return true; // Default: allow all for now
    },
  },
});
