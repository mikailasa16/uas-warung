import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';

export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Rute tidak ditemukan: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 422;
    message = err.issues[0]?.message || 'Data tidak valid';
    details = err.flatten().fieldErrors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { status = 409; message = 'Data dengan nilai yang sama sudah ada'; }
    else if (err.code === 'P2025') { status = 404; message = 'Data tidak ditemukan'; }
    else if (err.code === 'P2003') { status = 409; message = 'Data masih dipakai data lain sehingga tidak bisa dihapus'; }
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server' : message,
    ...(details && { details }),
  });
}
