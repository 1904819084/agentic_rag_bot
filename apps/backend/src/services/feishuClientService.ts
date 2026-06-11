import {
  AppType,
  Client,
  Domain,
  LoggerLevel,
  withUserAccessToken,
  type HttpRequestOptions,
} from '@larksuiteoapi/node-sdk';
import { Injectable } from '@gulux/gulux';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

export interface FeishuOAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  tokenType?: string;
}

export interface FeishuOAuthUserInfo {
  openId: string;
  unionId?: string;
  name: string;
  avatarUrl?: string;
}

export interface FeishuSdkClient {
  domain?: string;
  httpInstance?: {
    request<T = unknown, R = T, D = Record<string, unknown>>(
      payload: HttpRequestOptions<D>,
    ): Promise<R>;
  };
  authen?: {
    userInfo?: {
      get?: (payload?: {}, options?: unknown) => Promise<FeishuApiResponse<FeishuUserInfoData>>;
    };
  };
  wiki?: {
    v2?: {
      space?: {
        getNode?: (
          payload?: { params: { token: string; obj_type?: 'wiki' } },
          options?: unknown,
        ) => Promise<FeishuApiResponse<FeishuWikiNodeData>>;
      };
    };
  };
  docx?: {
    v1?: {
      document?: {
        get?: (
          payload?: { path: { document_id: string } },
          options?: unknown,
        ) => Promise<FeishuApiResponse<FeishuDocumentMetadataData>>;
      };
    };
  };
  docs?: {
    v1?: {
      content?: {
        get?: (
          payload?: {
            params: {
              doc_token: string;
              doc_type: 'docx';
              content_type: 'markdown';
              lang: 'zh';
            };
          },
          options?: unknown,
        ) => Promise<FeishuApiResponse<FeishuDocumentContentData>>;
      };
    };
  };
  im?: {
    v1?: {
      message?: {
        reply?: (
          payload?: {
            data: { content: string; msg_type: string };
            path: { message_id: string };
          },
          options?: unknown,
        ) => Promise<FeishuApiResponse<{ message_id?: string }>>;
      };
    };
  };
}

type FeishuApiResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
  error?: string;
  error_description?: string;
};

type FeishuTokenResponse = FeishuApiResponse<FeishuTokenData> & FeishuTokenData;

type FeishuTokenData = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  refresh_expires_in?: unknown;
  refresh_token_expires_in?: unknown;
  token_type?: unknown;
};

type FeishuUserInfoData = {
  open_id?: unknown;
  union_id?: unknown;
  name?: unknown;
  en_name?: unknown;
  avatar_url?: unknown;
  avatar_thumb?: unknown;
  avatar_middle?: unknown;
  avatar_big?: unknown;
};

type FeishuWikiNodeData = {
  node?: {
    obj_token?: unknown;
    obj_type?: unknown;
  };
};

type FeishuDocumentMetadataData = {
  document?: {
    title?: unknown;
  };
};

type FeishuDocumentContentData = {
  content?: unknown;
};

const FEISHU_OAUTH_TOKEN_PATH = '/open-apis/authen/v2/oauth/token';

function requireFeishuAppConfig() {
  if (!env.feishu.appId || !env.feishu.appSecret) {
    throw new AppError(
      'feishu_app_not_configured',
      500,
      'FEISHU_APP_ID and FEISHU_APP_SECRET are required',
    );
  }
}

function createDefaultFeishuClient() {
  requireFeishuAppConfig();
  return new Client({
    appId: env.feishu.appId,
    appSecret: env.feishu.appSecret,
    appType: AppType.SelfBuild,
    domain: Domain.Feishu,
    loggerLevel: LoggerLevel.warn,
    source: 'rag',
  }) as FeishuSdkClient;
}

function feishuRequestOptions(userAccessToken?: string) {
  return userAccessToken ? withUserAccessToken(userAccessToken) : undefined;
}

function assertFeishuOk<T>(
  response: FeishuApiResponse<T> | undefined,
  errorCode: string,
  fallbackMessage: string,
): T {
  if (!response || response.code !== 0 || !response.data) {
    throw new AppError(errorCode, 502, response?.msg || fallbackMessage);
  }
  return response.data;
}

function normalizeTokenResponse(body: FeishuTokenData): FeishuOAuthToken {
  if (typeof body.access_token !== 'string' || !body.access_token) {
    throw new AppError(
      'feishu_user_token_response_invalid',
      502,
      'Feishu OAuth response missing access_token',
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : undefined,
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : undefined,
    refreshExpiresIn:
      typeof body.refresh_expires_in === 'number'
        ? body.refresh_expires_in
        : typeof body.refresh_token_expires_in === 'number'
          ? body.refresh_token_expires_in
          : undefined,
    tokenType: typeof body.token_type === 'string' ? body.token_type : undefined,
  };
}

function normalizeUserInfo(data: FeishuUserInfoData): FeishuOAuthUserInfo {
  const openId = typeof data.open_id === 'string' ? data.open_id : '';
  if (!openId) {
    throw new AppError(
      'feishu_user_info_response_invalid',
      502,
      'Feishu user info response missing open_id',
    );
  }

  const name =
    typeof data.name === 'string' && data.name
      ? data.name
      : typeof data.en_name === 'string' && data.en_name
        ? data.en_name
        : openId;

  return {
    openId,
    unionId: typeof data.union_id === 'string' ? data.union_id : undefined,
    name,
    avatarUrl:
      typeof data.avatar_url === 'string'
        ? data.avatar_url
        : typeof data.avatar_middle === 'string'
          ? data.avatar_middle
          : typeof data.avatar_thumb === 'string'
            ? data.avatar_thumb
            : undefined,
  };
}

function buildFeishuErrorMessage(body: FeishuApiResponse<unknown>, fallback: string) {
  return (
    [
      body.msg,
      body.error,
      body.error_description,
      typeof body.code === 'number' || typeof body.code === 'string'
        ? `code=${body.code}`
        : undefined,
    ]
      .filter(Boolean)
      .join(', ') || fallback
  );
}

@Injectable()
export default class FeishuClientService {
  private readonly defaultClient = createDefaultFeishuClient();

  protected getClient(): FeishuSdkClient {
    return this.defaultClient;
  }

  public async exchangeCodeForUserAccessToken(input: {
    code: string;
    redirectUri: string;
  }): Promise<FeishuOAuthToken> {
    return this.requestUserToken({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
    });
  }

  public async refreshUserAccessToken(refreshToken: string): Promise<FeishuOAuthToken> {
    return this.requestUserToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  public async getUserInfo(accessToken: string): Promise<FeishuOAuthUserInfo> {
    const client = this.getClient();
    const data = assertFeishuOk(
      await client.authen?.userInfo?.get?.({}, feishuRequestOptions(accessToken)),
      'feishu_user_info_request_failed',
      'Feishu user info request failed',
    );
    return normalizeUserInfo(data);
  }

  public async getDocumentTokenFromWikiNode(wikiToken: string, userAccessToken?: string) {
    const client = this.getClient();
    const data = assertFeishuOk(
      await client.wiki?.v2?.space?.getNode?.(
        { params: { token: wikiToken, obj_type: 'wiki' } },
        feishuRequestOptions(userAccessToken),
      ),
      'feishu_wiki_node_failed',
      'Feishu Wiki node request failed',
    );
    const objType = typeof data.node?.obj_type === 'string' ? data.node.obj_type : '';
    const objToken = typeof data.node?.obj_token === 'string' ? data.node.obj_token : '';

    if (objType !== 'docx') {
      throw new AppError(
        'unsupported_feishu_wiki_object_type',
        422,
        `Only Wiki nodes backed by docx are supported, got: ${objType || 'unknown'}`,
      );
    }

    if (!objToken) {
      throw new AppError(
        'feishu_wiki_node_missing_docx_token',
        502,
        'Feishu Wiki node response missing docx token',
      );
    }

    return objToken;
  }

  public async getDocumentMetadata(documentToken: string, userAccessToken?: string) {
    const client = this.getClient();
    const data = assertFeishuOk(
      await client.docx?.v1?.document?.get?.(
        { path: { document_id: documentToken } },
        feishuRequestOptions(userAccessToken),
      ),
      'feishu_docx_metadata_failed',
      'Feishu Docx metadata request failed',
    );

    return {
      title: typeof data.document?.title === 'string' ? data.document.title : '',
    };
  }

  public async getDocumentMarkdownContent(documentToken: string, userAccessToken?: string) {
    const client = this.getClient();
    const data = assertFeishuOk(
      await client.docs?.v1?.content?.get?.(
        {
          params: {
            doc_token: documentToken,
            doc_type: 'docx',
            content_type: 'markdown',
            lang: 'zh',
          },
        },
        feishuRequestOptions(userAccessToken),
      ),
      'feishu_docx_content_failed',
      'Feishu Docs markdown request failed',
    );

    if (typeof data.content !== 'string') {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        'Feishu Docs markdown response missing content',
      );
    }

    return data.content;
  }

  public async replyTextMessage(input: { messageId?: string; text: string }) {
    if (!input.messageId) {
      return { ok: false, messageId: input.messageId, text: input.text };
    }

    const client = this.getClient();
    const data = assertFeishuOk(
      await client.im?.v1?.message?.reply?.({
        path: { message_id: input.messageId },
        data: {
          msg_type: 'text',
          content: JSON.stringify({ text: input.text }),
        },
      }),
      'feishu_reply_message_failed',
      'Feishu reply message request failed',
    );

    return {
      ok: true,
      messageId: data.message_id ?? input.messageId,
      text: input.text,
    };
  }

  private async requestUserToken(payload: Record<string, string>): Promise<FeishuOAuthToken> {
    requireFeishuAppConfig();

    const client = this.getClient();
    const body = await client.httpInstance?.request<
      FeishuTokenResponse,
      FeishuTokenResponse
    >({
      url: `${client.domain ?? 'https://open.feishu.cn'}${FEISHU_OAUTH_TOKEN_PATH}`,
      method: 'POST',
      data: {
        client_id: env.feishu.appId,
        client_secret: env.feishu.appSecret,
        ...payload,
      },
    });

    if (!body || body.code !== 0) {
      throw new AppError(
        'feishu_user_token_request_failed',
        502,
        buildFeishuErrorMessage(body ?? {}, 'Feishu OAuth token request failed'),
      );
    }

    const tokenBody = body.data ?? body;

    return normalizeTokenResponse(tokenBody);
  }
}
