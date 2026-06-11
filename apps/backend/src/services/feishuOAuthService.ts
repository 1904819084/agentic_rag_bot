import { Injectable } from '@gulux/gulux';
import { env } from '../config/env';
import { AppError } from '../utils/appError';
import FeishuClientService, {
  type FeishuOAuthToken,
  type FeishuOAuthUserInfo,
} from './feishuClientService';

const FEISHU_OAUTH_AUTHORIZE_URL = 'https://accounts.feishu.cn/open-apis/authen/v1/authorize';

export type { FeishuOAuthToken, FeishuOAuthUserInfo } from './feishuClientService';

function requireFeishuAppConfig() {
  if (!env.feishu.appId || !env.feishu.appSecret) {
    throw new AppError(
      'feishu_app_not_configured',
      500,
      'FEISHU_APP_ID and FEISHU_APP_SECRET are required',
    );
  }
}

@Injectable()
export default class FeishuOAuthService {
  public constructor(private readonly feishuClientService: FeishuClientService) {}

  public buildAuthorizationUrl(input: { redirectUri: string; state: string; scope?: string }) {
    requireFeishuAppConfig();

    const authorizationUrl = new URL(FEISHU_OAUTH_AUTHORIZE_URL);
    authorizationUrl.searchParams.set('client_id', env.feishu.appId);
    authorizationUrl.searchParams.set('redirect_uri', input.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', input.state);
    if (input.scope) {
      authorizationUrl.searchParams.set('scope', input.scope);
    }

    return {
      authorizationUrl: authorizationUrl.toString(),
      redirectUri: input.redirectUri,
      state: input.state,
    };
  }

  public async exchangeCodeForUserAccessToken(input: {
    code: string;
    redirectUri: string;
  }): Promise<FeishuOAuthToken> {
    return this.feishuClientService.exchangeCodeForUserAccessToken(input);
  }

  public async refreshUserAccessToken(refreshToken: string): Promise<FeishuOAuthToken> {
    return this.feishuClientService.refreshUserAccessToken(refreshToken);
  }

  public async getUserInfo(accessToken: string): Promise<FeishuOAuthUserInfo> {
    return this.feishuClientService.getUserInfo(accessToken);
  }
}
