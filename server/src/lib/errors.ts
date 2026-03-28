import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logActivity } from './activity.js';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, code = 'api_error') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = <
  TReq extends Request = Request,
  TRes extends Response = Response,
>(
  handler: (req: TReq, res: TRes, next: NextFunction) => Promise<unknown>,
) => {
  return (req: TReq, res: TRes, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export const sendSuccess = (
  req: Request,
  res: Response,
  data: unknown,
  meta: Record<string, unknown> = {},
) => {
  return res.json({
    ok: true,
    data,
    meta: {
      requestId: req.requestContext?.requestId || null,
      ...meta,
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  req.requestContext.errorCode = 'not_found';
  void logActivity(req, {
    action: 'request_failed',
    entityType: 'http_request',
    metadata: {
      route: req.originalUrl,
      method: req.method,
      statusCode: 404,
    },
    errorCode: 'not_found',
  });

  res.status(404).json({
    ok: false,
    error: {
      message: 'Rota nao encontrada.',
      code: 'not_found',
    },
    meta: {
      requestId: req.requestContext?.requestId || null,
    },
  });
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    req.requestContext.errorCode = 'invalid_payload';
    void logActivity(req, {
      action: 'request_failed',
      entityType: 'http_request',
      metadata: {
        route: req.originalUrl,
        method: req.method,
        statusCode: 400,
      },
      errorCode: 'invalid_payload',
    });

    return res.status(400).json({
      ok: false,
      error: {
        message: 'Payload invalido.',
        code: 'invalid_payload',
        details: error.flatten(),
      },
      meta: {
        requestId: req.requestContext?.requestId || null,
      },
    });
  }

  if (error instanceof ApiError) {
    req.requestContext.errorCode = error.code;
    void logActivity(req, {
      action: 'request_failed',
      entityType: 'http_request',
      metadata: {
        route: req.originalUrl,
        method: req.method,
        statusCode: error.statusCode,
        details: error.details ?? null,
      },
      errorCode: error.code,
    });

    return res.status(error.statusCode).json({
      ok: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      meta: {
        requestId: req.requestContext?.requestId || null,
      },
    });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    req.requestContext.errorCode = 'invalid_json';
    void logActivity(req, {
      action: 'request_failed',
      entityType: 'http_request',
      metadata: {
        route: req.originalUrl,
        method: req.method,
        statusCode: 400,
      },
      errorCode: 'invalid_json',
    });

    return res.status(400).json({
      ok: false,
      error: {
        message: 'JSON invalido.',
        code: 'invalid_json',
      },
      meta: {
        requestId: req.requestContext?.requestId || null,
      },
    });
  }

  req.requestContext.errorCode = 'internal_error';
  void logActivity(req, {
    action: 'request_failed',
    entityType: 'http_request',
    metadata: {
      route: req.originalUrl,
      method: req.method,
      statusCode: 500,
    },
    errorCode: 'internal_error',
  });
  console.error('[api] unexpected error:', error);

  return res.status(500).json({
    ok: false,
    error: {
      message: 'Erro interno do servidor.',
      code: 'internal_error',
    },
    meta: {
      requestId: req.requestContext?.requestId || null,
    },
  });
};
