import { Router } from 'express';
import { sendSuccess } from '../lib/errors.js';

const router = Router();

router.get('/health', (req, res) => {
  return sendSuccess(req, res, {
    status: 'ok',
    service: 'escala-que-converte-api',
    now: new Date().toISOString(),
  });
});

export default router;
