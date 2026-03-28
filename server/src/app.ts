import cors from 'cors';
import express from 'express';
import env from './config/env.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { requestContext } from './middleware/requestContext.js';
import adminRouter from './routes/admin.js';
import healthRouter from './routes/health.js';
import storesRouter from './routes/stores.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.frontendOrigins.length > 0 ? env.frontendOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);

app.use('/api', healthRouter);
app.use('/api/admin', adminRouter);
app.use('/api/stores', storesRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
