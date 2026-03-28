import type { RequestHandler } from 'express';
import { ApiError } from '../lib/errors.js';

export const requireStoreAccess: RequestHandler = async (req, _res, next) => {
  try {
    const rawStoreId = req.params.storeId;
    const storeId = Array.isArray(rawStoreId) ? rawStoreId[0] : rawStoreId;

    if (!storeId) {
      throw new ApiError(400, 'storeId e obrigatorio.', undefined, 'invalid_store_id');
    }

    if (req.auth?.platformRole === 'admin') {
      req.storeMembership = {
        storeId,
        role: 'admin',
      };
      return next();
    }

    const { data, error } = await req.supabase
      .from('store_members')
      .select('store_id, role')
      .eq('store_id', storeId)
      .eq('user_id', req.auth.user.id)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, 'Falha ao validar acesso a loja.', error.message, 'store_access_failed');
    }

    if (!data) {
      throw new ApiError(403, 'Voce nao tem acesso a esta loja.', undefined, 'forbidden');
    }

    req.storeMembership = {
      storeId: data.store_id,
      role: data.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
