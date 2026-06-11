import { Inject } from '@gulux/gulux';
import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  type HTTPRequest,
  type HTTPResponse,
} from '@gulux/gulux/application-http';
import type { AuthLoginUrlResponse, AuthMeResponse } from '@rag/shared';
import { env } from '../config/env';
import AuthService from '../services/authService';
import FeishuOAuthService from '../services/feishuOAuthService';
import { AppError } from '../utils/appError';
import {
  clearAuthSessionCookie,
  clearFeishuOAuthStateCookie,
  createAuthSessionCookie,
  createFeishuOAuthStateCookie,
  getAuthSessionCookieName,
  getFeishuOAuthStateCookieName,
  readCookie,
} from '../utils/cookie';
import { createId } from '../utils/id';

const DEFAULT_FRONTEND_URL = 'http://localhost:5175';

function getRequestOrigin(req: HTTPRequest) {
  const protocol = req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}`;
}

function getAuthRedirectUri(req: HTTPRequest) {
  return env.feishu.authRedirectUri || `${getRequestOrigin(req)}/api/auth/feishu/callback`;
}

function getAuthSuccessRedirectUri() {
  return env.feishu.authSuccessRedirectUri || `${DEFAULT_FRONTEND_URL}/chat`;
}

function getSessionId(req: HTTPRequest) {
  const cookieValue = req.cookies.get(getAuthSessionCookieName());
  return typeof cookieValue === 'string'
    ? cookieValue
    : readCookie(req.get('cookie'), getAuthSessionCookieName());
}

@Controller({ path: '/auth' })
export default class AuthController {
  @Inject(FeishuOAuthService)
  private readonly feishuOAuthService!: FeishuOAuthService;

  @Inject(AuthService)
  private readonly authService!: AuthService;

  @Get('/feishu/login-url')
  public loginUrl(@Req() req: HTTPRequest, @Res() res: HTTPResponse): AuthLoginUrlResponse {
    const authorization = this.buildLoginAuthorization(req);
    res.set('Set-Cookie', createFeishuOAuthStateCookie(authorization.state));
    return { loginUrl: authorization.authorizationUrl };
  }

  private buildLoginAuthorization(req: HTTPRequest) {
    const redirectUri = getAuthRedirectUri(req);
    return this.feishuOAuthService.buildAuthorizationUrl({
      redirectUri,
      state: createId('feishu_login_state'),
      scope: env.feishu.oauthScope,
    });
  }

  @Get('/feishu/callback')
  public async callback(
    @Req() req: HTTPRequest,
    @Res() res: HTTPResponse,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    if (!code) {
      throw new AppError('missing_feishu_oauth_code', 400, 'code is required');
    }
    const expectedState = getFeishuOAuthState(req);
    if (!state || !expectedState || state !== expectedState) {
      throw new AppError('invalid_feishu_oauth_state', 400, 'invalid OAuth state');
    }

    const token = await this.feishuOAuthService.exchangeCodeForUserAccessToken({
      code,
      redirectUri: getAuthRedirectUri(req),
    });
    const feishuUser = await this.feishuOAuthService.getUserInfo(token.accessToken);
    const session = await this.authService.createFeishuSession({
      feishuOpenId: feishuUser.openId,
      feishuUnionId: feishuUser.unionId,
      name: feishuUser.name,
      avatarUrl: feishuUser.avatarUrl,
      token,
    });

    res.set('Set-Cookie', [
      createAuthSessionCookie(session),
      clearFeishuOAuthStateCookie(),
    ]);
    res.type = 'html';
    const successRedirectUri = getAuthSuccessRedirectUri();
    res.body = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${successRedirectUri}" />
    <title>登录成功</title>
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(successRedirectUri)});</script>
    登录成功，正在返回系统...
  </body>
</html>`;
  }

  @Get('/me')
  public async me(@Req() req: HTTPRequest): Promise<AuthMeResponse> {
    const user = await this.authService.getCurrentUser(getSessionId(req));
    if (!user) {
      throw new AppError('unauthorized', 401, 'unauthorized');
    }

    return { user };
  }

  @Post('/logout')
  public async logout(@Req() req: HTTPRequest, @Res() res: HTTPResponse) {
    await this.authService.logout(getSessionId(req));
    res.set('Set-Cookie', clearAuthSessionCookie());
    return { ok: true };
  }
}

function getFeishuOAuthState(req: HTTPRequest) {
  const cookieValue = req.cookies.get(getFeishuOAuthStateCookieName());
  return typeof cookieValue === 'string'
    ? cookieValue
    : readCookie(req.get('cookie'), getFeishuOAuthStateCookieName());
}
