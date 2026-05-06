import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              password: '',
              role: 'PATIENT',
              emailVerified: true,
              patient: {
                create: {
                  firstName: user.name?.split(' ')[0] || '',
                  lastName: user.name?.split(' ').slice(1).join(' ') || '',
                  preferredLanguage: 'fr',
                },
              },
            },
          });
        }

        return true;
      } catch (error) {
        console.error('[Google SignIn Error]', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { provider: { select: { tier: true } } },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.tier = dbUser.provider?.tier ?? null;
          token.appToken = signToken({
            userId: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            ...(dbUser.provider?.tier ? { tier: dbUser.provider.tier } : {}),
          });
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.tier = token.tier as string | null;
        session.appToken = token.appToken as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/en/auth/login',
    error: '/en/auth/login',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
