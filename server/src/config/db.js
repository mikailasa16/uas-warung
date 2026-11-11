// Koneksi MySQL (Prisma) - satu instance bersama.
import { PrismaClient, Prisma } from '@prisma/client';
import { env } from './env.js';

// Kolom DECIMAL dikirim ke client sebagai angka (bukan string).
Prisma.Decimal.prototype.toJSON = function toJSON() {
  return this.toNumber();
};

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
