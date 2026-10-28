import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/lib/configure-app.js';

const registration = {
  name: ' Robus ',
  email: ' ROBUS@example.com ',
  password: ' AbC123 ',
};
const missingNoteId = '7cbe3fe3-7118-4aa3-9b70-608693cd52d1';
const publicUser = { name: 'Robus', email: 'robus@example.com' };

describe('API de auth y notas (e2e)', () => {
  let app: INestApplication;
  let directory: string;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'nest-api-e2e-'));
    vi.stubEnv('DATA_FILE', join(directory, 'db.json'));
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    agent = request.agent(app.getHttpServer());
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  it('registra, guarda la cookie, consulta me, cierra sesion y permite volver a ingresar', async () => {
    const registered = await agent
      .post('/api/auth/register')
      .send(registration)
      .expect(200);
    expect(registered.body).toEqual(publicUser);
    const cookie = registered.headers['set-cookie'][0];
    expect(cookie).toContain('session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=604800');
    await agent.get('/api/auth/me').expect(200, publicUser);
    await agent.post('/api/auth/logout').expect(200, { ok: true });
    await agent.get('/api/auth/me').expect(401);
    await agent
      .post('/api/auth/login')
      .send({ email: ' ROBUS@example.com ', password: registration.password })
      .expect(200, publicUser);
    await agent.get('/api/auth/me').expect(200, publicUser);

    const stored = JSON.parse(
      await readFile(join(directory, 'db.json'), 'utf8'),
    );
    expect(stored.users[0].passwordHash).not.toBe(registration.password);
    expect(stored.users[0]).not.toHaveProperty('password');
  });

  it('devuelve 409 cuando el email ya existe, incluso con distinta capitalizacion', async () => {
    await agent.post('/api/auth/register').send(registration).expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...registration, email: publicUser.email })
      .expect(409);
  });

  it('no permite un login con la contraseña recortada ni con un email inexistente', async () => {
    await agent.post('/api/auth/register').send(registration).expect(200);
    const client = request(app.getHttpServer());
    await client
      .post('/api/auth/login')
      .send({ email: publicUser.email, password: registration.password.trim() })
      .expect(401);
    await client
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: registration.password })
      .expect(401);
  });

  it.each([
    { name: ' ' },
    { name: 123 },
    { password: 123456 },
    { email: 'invalido' },
  ])(
    'rechaza el registro invalido con 400 y message como texto: %j',
    async (invalid) => {
      const response = await agent
        .post('/api/auth/register')
        .send({ ...registration, ...invalid })
        .expect(400);
      expect(response.body.message).toEqual(expect.any(String));
    },
  );

  it.each(['get', 'post', 'patch', 'delete'] as const)(
    'rechaza %s /notes sin sesion antes de validar el DTO',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method](
          method === 'delete' ? `/api/notes/${missingNoteId}` : '/api/notes',
        )
        .send({})
        .expect(401);
      expect(response.body.message).toBe('No autorizado');
    },
  );

  it('rechaza cookies de sesion invalidas', async () => {
    await agent
      .get('/api/auth/me')
      .set('Cookie', 'session=invalida')
      .expect(401);
    await agent.get('/api/notes').set('Cookie', 'session=invalida').expect(401);
  });

  it('crea, lista, marca, edita y elimina una nota', async () => {
    await agent.post('/api/auth/register').send(registration).expect(200);
    await agent.get('/api/notes').expect(200, { notes: [] });
    const created = await agent
      .post('/api/notes')
      .send({
        title: ' Titulo ',
        minutes: '2',
        userId: 'otro-usuario',
        extra: true,
      })
      .expect(201);
    const note = created.body.note;
    expect(note).toEqual({
      id: expect.any(String),
      title: 'Titulo',
      text: '',
      minutes: 2,
      createdAt: expect.any(Number),
      notified: false,
    });
    await agent.get('/api/notes').expect(200, { notes: [note] });
    await agent
      .patch('/api/notes')
      .send({ id: note.id, notified: true })
      .expect(200, { note: { ...note, notified: true } });
    const modified = await agent
      .patch('/api/notes')
      .send({ id: note.id, title: ' Nuevo ', text: ' Texto ', minutes: 5 })
      .expect(200);
    expect(modified.body.note).toMatchObject({
      id: note.id,
      title: 'Nuevo',
      text: 'Texto',
      minutes: 5,
      notified: false,
    });
    expect(modified.body.note.createdAt).toBeGreaterThanOrEqual(note.createdAt);
    await agent.delete(`/api/notes/${note.id}`).expect(200, { ok: true });
    await agent.get('/api/notes').expect(200, { notes: [] });
  });

  it('no permite listar, editar, marcar ni borrar notas ajenas', async () => {
    await agent.post('/api/auth/register').send(registration).expect(200);
    const created = await agent
      .post('/api/notes')
      .send({ title: 'Propia', minutes: 1 })
      .expect(201);
    const other = request.agent(app.getHttpServer());
    await other
      .post('/api/auth/register')
      .send({ ...registration, email: 'other@example.com' })
      .expect(200);
    await other.get('/api/notes').expect(200, { notes: [] });
    await other
      .patch('/api/notes')
      .send({ id: created.body.note.id, title: 'Ajena', minutes: 1 })
      .expect(404);
    await other
      .patch('/api/notes')
      .send({ id: created.body.note.id, notified: true })
      .expect(404);
    await other.delete(`/api/notes/${created.body.note.id}`).expect(404);
    await agent.get('/api/notes').expect(200, { notes: [created.body.note] });
  });

  it('valida los datos de las notas y devuelve 404 para ids inexistentes', async () => {
    await agent.post('/api/auth/register').send(registration).expect(200);
    await agent.post('/api/notes').send({ title: ' ', minutes: 1 }).expect(400);
    await agent
      .post('/api/notes')
      .send({ title: 'Titulo', minutes: true })
      .expect(400);
    await agent.patch('/api/notes').send({ notified: true }).expect(400);
    await agent
      .patch('/api/notes')
      .send({ id: 'no-es-un-uuid', notified: true })
      .expect(400);
    await agent
      .patch('/api/notes')
      .send({ id: missingNoteId, title: 'Titulo' })
      .expect(400);
    await agent
      .patch('/api/notes')
      .send({ id: missingNoteId, notified: true })
      .expect(404);
    await agent.delete('/api/notes').expect(404);
    await agent.delete('/api/notes/no-es-un-uuid').expect(400);
    await agent.delete(`/api/notes/${missingNoteId}`).expect(404);
  });

  it('publica Swagger con las ocho operaciones, sus DTOs y autenticacion por cookie', async () => {
    await agent.get('/api/docs/').expect(200).expect('Content-Type', /html/);
    const { body: document } = await agent.get('/api/docs-json').expect(200);
    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/auth/register',
      '/api/notes',
      '/api/notes/{id}',
    ]);
    expect(Object.keys(document.paths['/api/notes']).sort()).toEqual([
      'get',
      'patch',
      'post',
    ]);
    expect(Object.keys(document.paths['/api/notes/{id}'])).toEqual(['delete']);
    expect(document.paths['/api/notes/{id}'].delete.parameters).toContainEqual(
      expect.objectContaining({
        name: 'id',
        in: 'path',
        required: true,
        schema: expect.objectContaining({ format: 'uuid' }),
      }),
    );
    expect(document.paths['/api/notes'].get.security).toContainEqual({
      session: [],
    });
    expect(document.components.securitySchemes.session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'session',
    });
    expect(document.components.schemas.RegisterDto.properties).toHaveProperty(
      'password',
    );
    expect(document.components.schemas.CreateNoteDto.required).toEqual([
      'title',
      'minutes',
    ]);
    expect(document.components.schemas.ModifyNoteDto.properties.id.format).toBe(
      'uuid',
    );
    expect(document.components.schemas.Note.properties).not.toHaveProperty(
      'userId',
    );
    expect(document.paths['/api/auth/register'].post.responses).toHaveProperty(
      '200',
    );
    expect(document.paths['/api/auth/register'].post.responses).toHaveProperty(
      '409',
    );
    expect(document.paths['/api/notes'].post.responses).toHaveProperty('201');
  });
});
