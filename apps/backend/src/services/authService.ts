import { Injectable } from '@gulux/gulux';
import type { AuthUser } from '@rag/shared';
import AuthRepository from '../repositories/authRepository';
import { createId } from '../utils/id';
import type { FeishuOAuthToken } from './feishuClientService';
import FeishuOAuthService from './feishuOAuthService';

const SESSION_TTL_DAYS = 7;

@Injectable()
export default class AuthService {
  public constructor(
    private readonly authRepository: AuthRepository,
    private readonly feishuOAuthService: FeishuOAuthService,
  ) {}

  public async createFeishuSession(input: {
    feishuOpenId: string;
    feishuUnionId?: string;
    name: string;
    avatarUrl?: string;
    token?: FeishuOAuthToken;
  }): Promise<{ user: AuthUser; sessionId: string; expiresAt: string }> {
    const user = await this.authRepository.upsertFeishuUser(input);
    const sessionId = createId('session');
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      feishuAccessToken: input.token?.accessToken,
      feishuRefreshToken: input.token?.refreshToken,
      feishuTokenExpiresAt: toExpiresAt(input.token?.expiresIn),
      feishuRefreshExpiresAt: toExpiresAt(input.token?.refreshExpiresIn),
      expiresAt,
    });

    return { user, sessionId, expiresAt };
  }

  public getCurrentUser(sessionId?: string): Promise<AuthUser | null> {
    if (!sessionId) {
      return Promise.resolve(null);
    }

    return this.authRepository.getUserBySessionId(sessionId);
  }

  public async logout(sessionId?: string) {
    if (!sessionId) {
      return false;
    }

    return this.authRepository.deleteSession(sessionId);
  }

  public async getFeishuAccessToken(sessionId?: string) {
    if (!sessionId) {
      return undefined;
    }

    const session = await this.authRepository.getSessionById(sessionId);
    if (!session?.feishuAccessToken) {
      return undefined;
    }

    if (
      session.feishuTokenExpiresAt &&
      new Date(session.feishuTokenExpiresAt).getTime() <= Date.now()
    ) {
      return this.refreshFeishuAccessToken(sessionId, session.feishuRefreshToken);
    }

    return session.feishuAccessToken;
  }

  private async refreshFeishuAccessToken(sessionId: string, refreshToken?: string) {
    if (!refreshToken) {
      return undefined;
    }

    const token = await this.feishuOAuthService.refreshUserAccessToken(refreshToken);
    await this.authRepository.updateSessionFeishuToken(sessionId, {
      feishuAccessToken: token.accessToken,
      feishuRefreshToken: token.refreshToken ?? refreshToken,
      feishuTokenExpiresAt: toExpiresAt(token.expiresIn),
      feishuRefreshExpiresAt: toExpiresAt(token.refreshExpiresIn),
    });

    return token.accessToken;
  }
}

function toExpiresAt(expiresInSeconds?: number) {
  if (!expiresInSeconds) {
    return undefined;
  }

  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
