import type { Request } from 'express';
import { readSession, SESSION_COOKIE } from './session.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

export type AuthenticatedRequest = Request & { userId: string };

export async function currentUserId(req: Request): Promise<string | null> {
  const token = req.cookies?.[SESSION_COOKIE];

  const session = await readSession(token);

  return session?.sub ? session.sub : null;
}

// Los guards se ejecutan antes que los pipes de validacion de los DTOs.
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = await currentUserId(req);
    if (!userId) throw new UnauthorizedException('No autorizado');
    req.userId = userId;
    return true;
  }
}
