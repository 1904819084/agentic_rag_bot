import type { ApplicationConfig } from '@gulux/gulux';
import { env } from './env';
import CorsMiddleware from '../middlewares/CorsMiddleware';
import GlobalExceptionMiddleware from '../middlewares/GlobalExceptionMiddleware';
import NotFoundMiddleware from '../middlewares/NotFoundMiddleware';

export default {
  name: 'rag-business-qa-backend',
  middleware: [CorsMiddleware, GlobalExceptionMiddleware, NotFoundMiddleware],
  applicationHttp: {
    port: env.port,
    routerPrefix: '/api',
    bodyParser: {
      jsonLimit: '5mb',
    },
  },
} as ApplicationConfig;
