import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { checkPassword, hashPassword } from '../lib/password.js';
import { signSession } from '../lib/session.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JsonRepository } from '../repository/json.repository.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(private readonly repository: JsonRepository) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    const valid = user
      ? await checkPassword(password, user.passwordHash)
      : false;

    if (!user || !valid)
      throw new UnauthorizedException('Email o contraseña incorrectos.');

    const token = await signSession(user.id, user.email);
    return { name: user.name, email: user.email, token };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    const user = await this.repository.createUser({
      id: randomUUID(),
      name: name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
    });

    if (!user) throw new ConflictException('Ese email ya esta registrado.');

    const token = await signSession(user.id, user.email);
    return { name: user.name, email: user.email, token };
  }

  async me(userId: string) {
    if (!userId) throw new UnauthorizedException('No autorizado');

    const user = await this.repository.findUserById(userId);
    if (!user) throw new UnauthorizedException('No autorizado');

    return { name: user.name, email: user.email };
  }
}
