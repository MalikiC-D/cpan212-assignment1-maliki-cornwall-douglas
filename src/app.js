import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { requestLogger } from './middleware/request-logger.js';
import cacheRouter from './routes/cache.js';
import compareRouter from './routes/compare.js';
import weatherRouter from './routes/weather.js';

const app = express();
app.disable('x-powered-by');

app.use(requestLogger);

app.use('/api/weather', weatherRouter);
app.use('/api/compare', compareRouter);
app.use('/api/cache', cacheRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
