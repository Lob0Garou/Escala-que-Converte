import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const logRequest = (payload: Record<string, unknown>) => {
  console.log(JSON.stringify(payload));
};

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id')?.trim() || randomUUID();
  const startedAt = Date.now();

  req.requestContext = {
    requestId,
    startedAt,
    errorCode: null,
  };

  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    logRequest({
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      type: 'http_request',
      requestId,
      route: req.originalUrl,
      method: req.method,
      userId: req.auth?.user?.id || null,
      platformRole: req.auth?.platformRole || null,
      storeId: req.params?.storeId || req.storeMembership?.storeId || null,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      errorCode: req.requestContext.errorCode,
    });
  });

  next();
};
