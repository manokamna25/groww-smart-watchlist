import { prisma } from '../config/database';
import { hashPassword, comparePassword, generateToken } from './jwt';
import { AppError } from '../middleware/errorHandler';

export async function registerUser(email: string, password: string) {
  if (!email || !password || password.length < 6) {
    throw new AppError('Email and password (min 6 chars) are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('User with this email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  
  // Create user and a default "Main Watchlist"
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      watchlists: {
        create: {
          name: 'Main Watchlist',
        },
      },
    },
    include: {
      watchlists: true,
    },
  });

  const token = generateToken({ userId: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    token,
  };
}

export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken({ userId: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    token,
  };
}
