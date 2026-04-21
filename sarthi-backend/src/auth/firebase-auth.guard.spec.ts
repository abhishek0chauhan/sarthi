import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';

const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
  apps: ['mock-app'],
}));

import * as admin from 'firebase-admin';

function mockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  } as unknown as ExecutionContext;
}

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let verifyIdToken: jest.Mock;

  beforeEach(() => {
    guard = new FirebaseAuthGuard();
    verifyIdToken = (admin.auth() as any).verifyIdToken;
    verifyIdToken.mockReset();
  });

  it('throws 401 when no Authorization header', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when header is not Bearer', async () => {
    await expect(guard.canActivate(mockContext('Basic abc123'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when token is invalid', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid token'));
    await expect(guard.canActivate(mockContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and attaches user when token is valid', async () => {
    const decodedToken = { uid: 'user-123', email: 'test@test.com' };
    verifyIdToken.mockResolvedValue(decodedToken);

    const request: any = { headers: { authorization: 'Bearer valid-token' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.user).toEqual(decodedToken);
  });
});
