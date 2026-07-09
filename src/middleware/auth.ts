import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    // Get or create user in DB
    let [dbUser] = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        uid: decodedToken.uid,
        email: decodedToken.email || 'user@conectatech.com',
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Usuário ConectaTech',
        avatar: decodedToken.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        city: 'São Paulo',
        state: 'SP',
        bio: 'Entusiasta de tecnologia e inovação.',
        interests: ['Inteligência Artificial', 'Desenvolvimento Web'],
        role: 'attendee'
      }).returning();
      dbUser = newUser;
    }
    req.dbUser = dbUser;

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
