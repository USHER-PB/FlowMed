import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      tier: string | null;
    };
    appToken: string; // Our own JWT for API calls
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    tier: string | null;
    appToken: string;
  }
}
