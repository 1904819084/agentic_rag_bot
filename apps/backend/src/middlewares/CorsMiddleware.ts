import { GuluXMiddleware, Middleware, type NextFunction } from '@gulux/gulux';
import { Next, Req, Res, type HTTPRequest, type HTTPResponse } from '@gulux/gulux/application-http';

@Middleware()
export default class CorsMiddleware extends GuluXMiddleware {
  public async use(@Req() req: HTTPRequest, @Res() res: HTTPResponse, @Next() next: NextFunction) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id');

    if (req.method === 'OPTIONS') {
      res.status = 204;
      res.body = null;
      return;
    }

    await next();
  }
}
