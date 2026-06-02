import { GuluXMiddleware, Middleware, type NextFunction } from '@gulux/gulux';
import { Next, Res, type HTTPResponse } from '@gulux/gulux/application-http';
import { AppError } from '../utils/appError';

@Middleware()
export default class GlobalExceptionMiddleware extends GuluXMiddleware {
  public async use(@Res() res: HTTPResponse, @Next() next: NextFunction) {
    try {
      await next();
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      res.status = appError?.status ?? 500;
      res.body = {
        code: appError?.code ?? 'internal_error',
        message: error instanceof Error ? error.message : 'Internal server error',
      };
    }
  }
}
