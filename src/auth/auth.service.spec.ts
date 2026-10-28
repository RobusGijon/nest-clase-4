import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JsonRepository } from '../repository/json.repository.js';
import { checkPassword, hashPassword } from '../lib/password.js';
import { signSession } from '../lib/session.js';

vi.mock('../lib/password.js', () => ({
  checkPassword: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock('../lib/session.js', () => ({ signSession: vi.fn() }));

const user = {
  id: 'u1',
  name: 'Robus',
  email: 'robus@example.com',
  passwordHash: 'hash',
};

describe('AuthService', () => {
  const repository = {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    findUserById: vi.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new AuthService(repository as unknown as JsonRepository);
    vi.mocked(signSession).mockResolvedValue('session-token');
    vi.mocked(hashPassword).mockResolvedValue('hash');
  });

  it('normaliza el email del login y verifica la contraseña sin modificarla', async () => {
    repository.findUserByEmail.mockResolvedValue(user);
    vi.mocked(checkPassword).mockResolvedValue(true);
    await expect(
      service.login({ email: 'ROBUS@example.com', password: ' AbC123 ' }),
    ).resolves.toEqual({
      name: user.name,
      email: user.email,
      token: 'session-token',
    });
    expect(repository.findUserByEmail).toHaveBeenCalledWith('robus@example.com');
    expect(checkPassword).toHaveBeenCalledWith(' AbC123 ', 'hash');
    expect(signSession).toHaveBeenCalledWith('u1', user.email);
  });

  it('rechazar una contraseña incorrecta', async () => {
    repository.findUserByEmail.mockResolvedValue(user);
    vi.mocked(checkPassword).mockResolvedValue(false);
    await expect(
      service.login({ email: user.email, password: 'bad' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signSession).not.toHaveBeenCalled();
  });

  it('registrar el hash, normaliza el email y devuelve sesion sin exponer el hash', async () => {
    repository.createUser.mockResolvedValue(user);
    await expect(
      service.register({
        name: 'Robus',
        email: 'ROBUS@example.com',
        password: ' AbC123 ',
      }),
    ).resolves.toEqual({
      name: 'Robus',
      email: user.email,
      token: 'session-token',
    });
    expect(hashPassword).toHaveBeenCalledWith(' AbC123 ');
    expect(repository.createUser).toHaveBeenCalledWith({
      ...user,
      id: expect.any(String),
    });
    expect(signSession).toHaveBeenCalledWith('u1', user.email);
  });

  it('crear conflicto por email duplicado y no crea una sesion', async () => {
    repository.createUser.mockResolvedValue(null);
    await expect(
      service.register({
        name: 'Robus',
        email: user.email,
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(signSession).not.toHaveBeenCalled();
  });

  it('me consulta el id recibido y devuelve unicamente datos publicos', async () => {
    repository.findUserById.mockResolvedValue(user);
    await expect(service.me('u1')).resolves.toEqual({
      name: 'Robus',
      email: user.email,
    });
    expect(repository.findUserById).toHaveBeenCalledWith('u1');
  });

  it('me rechaza usuarios eliminados', async () => {
    repository.findUserById.mockResolvedValue(null);
    await expect(service.me('u1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
