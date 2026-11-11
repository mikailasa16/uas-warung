// Autentikasi JWT + otorisasi berbasis peran (RBAC).
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Silakan login terlebih dahulu'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch {
    next(new ApiError(401, 'Sesi berakhir, silakan login kembali'));
  }
}

// Contoh: router.post('/', authorize('admin'), handler)
export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'Anda tidak punya akses ke fitur ini'));
