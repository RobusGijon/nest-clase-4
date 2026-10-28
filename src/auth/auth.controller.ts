import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException} from '@nestjs/common';
import {ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from '../lib/session.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { currentUserId } from '../lib/current-user.js';
import { User } from './entity/user.entity.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesion y guardar la cookie por 7 dias' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Datos invalidos' })
  @ApiUnauthorizedResponse({ description: 'Email o contraseña incorrectos' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<User> {
    const { name, email, token } = await this.authService.login(loginDto);
    this.setSessionCookie(res, token);
    return { name, email };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesion y eliminar la cookie' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    return { ok: true };
  }

  @Get('me')
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Consultar el usuario de la sesion actual' })
  @ApiOkResponse({ type: User })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async me(@Req() req: Request): Promise<User> {
    const userId = await currentUserId(req);
    if (!userId) throw new UnauthorizedException('No autorizado');
    return this.authService.me(userId);
  }

  @Post('register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Registrar un usuario e iniciar su sesion' })
  @ApiOkResponse({ type: User })
  @ApiBadRequestResponse({ description: 'Datos invalidos' })
  @ApiConflictResponse({ description: 'Ese email ya esta registrado' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<User> {
    const { name, email, token } = await this.authService.register(registerDto);
    this.setSessionCookie(res, token);
    return { name, email };
  }
}
