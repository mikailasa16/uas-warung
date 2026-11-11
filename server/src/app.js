import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    // Development: semua origin boleh. Production: hanya yang ada di CORS_ORIGINS.
    // Aplikasi mobile native tidak mengirim header Origin, jadi selalu diizinkan.
    origin: (origin, cb) =>
      env.NODE_ENV !== 'production' || !origin || env.corsOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error('Origin tidak diizinkan oleh CORS')),
  }),
);
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
