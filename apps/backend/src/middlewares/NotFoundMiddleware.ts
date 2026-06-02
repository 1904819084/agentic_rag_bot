import { GuluXMiddleware, Middleware, type NextFunction } from '@gulux/gulux';
import { Next, Req, Res, type HTTPRequest, type HTTPResponse } from '@gulux/gulux/application-http';

@Middleware()
export default class NotFoundMiddleware extends GuluXMiddleware {
  public async use(@Req() req: HTTPRequest, @Res() res: HTTPResponse, @Next() next: NextFunction) {
    await next();

    if (res.status === 404 && (res.body === undefined || res.body === null)) {
      res.body = {
        code: 'not_found',
        message: 'API not found',
        path: req.originalUrl,
      };
    }
  }
}
