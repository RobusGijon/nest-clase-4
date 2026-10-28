import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SignJWT } from 'jose';
import { currentUserId, SessionGuard } from './current-user.js';
import { jwtSecret, signSession } from './session.js';

function requestWith(token: unknown) {
  return { cookies: { session: token } } as unknown as Request;
}

function contextWith(request: Request) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Usuario actual y SessionGuard', () => {
  it.each([undefined, null, 123, [], 'invalido'])(
    'devuelve null para una cookie invalida: %j',
    async (token) => {
      await expect(currentUserId(requestWith(token))).resolves.toBeNull();
    },
  );

  it('devuelve null si cookie-parser no recibio cookies', async () => {
    await expect(currentUserId({} as Request)).resolves.toBeNull();
  });

  it('lee el usuario de la cookie firmada', async () => {
    const req = requestWith(await signSession('u1', 'r@example.com'));
    await expect(currentUserId(req)).resolves.toBe('u1');
    await expect(
      new SessionGuard().canActivate(contextWith(req)),
    ).resolves.toBe(true);
    expect(req).toHaveProperty('userId', 'u1');
  });

  it('rechaza una sesion firmada sin subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .sign(jwtSecret);
    await expect(currentUserId(requestWith(token))).resolves.toBeNull();
  });

  it('el guard rechaza requests sin sesion', async () => {
    await expect(
      new SessionGuard().canActivate(contextWith({} as Request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
