import { SignJWT } from 'jose';
import { jwtSecret, readSession, signSession } from './session.js';

describe('Sesiones JWT', () => {
  it('firma una sesion con usuario, email y duracion de 7 dias', async () => {
    const payload = await readSession(await signSession('u1', 'r@example.com'));
    expect(payload).toMatchObject({ sub: 'u1', email: 'r@example.com' });
    expect(payload!.exp! - payload!.iat!).toBe(7 * 24 * 60 * 60);
  });

  it('rechaza tokens invalidos', async () => {
    await expect(readSession('no-es-un-jwt')).resolves.toBeNull();
  });

  it('rechaza tokens con otra firma', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .sign(new TextEncoder().encode('otro-secreto'));
    await expect(readSession(token)).resolves.toBeNull();
  });

  it('rechaza sesiones vencidas', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setExpirationTime(1)
      .sign(jwtSecret);
    await expect(readSession(token)).resolves.toBeNull();
  });
});
