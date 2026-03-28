import type { RequestHandler } from 'express';
import { ApiError } from '../lib/errors.js';

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.auth?.platformRole !== 'admin') {
    return next(new ApiError(403, 'Acesso restrito a administradores.', undefined, 'forbidden'));
  }

  next();
};

export const requireStoreWriteAccess: RequestHandler = (req, _res, next) => {
  if (req.auth?.platformRole === 'admin') {
    return next();
  }

  const role = req.storeMembership?.role;
  if (!role || role === 'viewer') {
    return next(new ApiError(403, 'Seu perfil possui acesso somente leitura.', undefined, 'forbidden'));
  }

  next();
};
