import { JsonRepository } from './json.repository.js';
import { JsonDB } from '../database/json-db.js';
import type { User } from '../database/json-db.js';
import type { StoredNote } from '../notes/entity/notes-entity.js';

describe('JsonRepository', () => {
  let data: { users: User[]; notes: StoredNote[] };
  let repository: JsonRepository;
  const user: User = {
    id: 'u1',
    name: 'Robus',
    email: 'robus@example.com',
    passwordHash: 'hash',
  };
  const note: StoredNote = {
    id: 'n1',
    userId: 'u1',
    title: 'Titulo',
    text: 'Texto',
    minutes: 2,
    createdAt: 100,
    notified: false,
  };

  beforeEach(() => {
    data = { users: [], notes: [] };
    const db = {
      read: vi.fn(async () => structuredClone(data)),
      update: vi.fn(async (change: (db: typeof data) => unknown) =>
        change(data),
      ),
    };
    repository = new JsonRepository(db as unknown as JsonDB);
  });
  afterEach(() => vi.restoreAllMocks());

  it('crea y encuentra usuarios por email e id', async () => {
    await expect(repository.createUser(user)).resolves.toEqual(user);
    await expect(repository.findUserByEmail(user.email)).resolves.toEqual(user);
    await expect(repository.findUserById('u1')).resolves.toEqual(user);
  });

  it('no permite emails duplicados', async () => {
    await repository.createUser(user);
    await expect(
      repository.createUser({ ...user, id: 'u2' }),
    ).resolves.toBeNull();
    expect(data.users).toHaveLength(1);
  });

  it('devuelve null para usuarios inexistentes', async () => {
    await expect(
      repository.findUserByEmail('missing@example.com'),
    ).resolves.toBeNull();
    await expect(repository.findUserById('missing')).resolves.toBeNull();
  });

  it('crea notas sin exponer el userId', async () => {
    const { userId: _userId, ...publicNote } = note;
    await expect(repository.createNote(note)).resolves.toEqual(publicNote);
    expect(data.notes).toEqual([note]);
  });

  it('filtra por usuario y ordena de mas nuevas a mas antiguas', async () => {
    data.notes = [
      note,
      { ...note, id: 'n2', createdAt: 200 },
      { ...note, id: 'n3', userId: 'u2', createdAt: 300 },
    ];
    const result = await repository.listNotes('u1');
    expect(result.map((item) => item.id)).toEqual(['n2', 'n1']);
    expect(result.every((item) => !('userId' in item))).toBe(true);
  });

  it('editar reinicia el plazo y notified, y conserva el dueño', async () => {
    data.notes = [{ ...note, notified: true }];
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const values = { title: 'Nuevo', text: '', minutes: 10 };
    await expect(repository.updateNote('u1', 'n1', values)).resolves.toEqual({
      id: 'n1',
      ...values,
      createdAt: 1000,
      notified: false,
    });
    expect(data.notes[0].userId).toBe('u1');
  });

  it('marcar como notificada conserva la fecha y los datos', async () => {
    data.notes = [{ ...note }];
    await repository.markNotified('u1', 'n1');
    expect(data.notes[0]).toEqual({ ...note, notified: true });
  });

  it.each(['update', 'notify', 'delete'])(
    'impide %s sobre notas ajenas',
    async (operation) => {
      data.notes = [{ ...note }];
      const result =
        operation === 'update'
          ? await repository.updateNote('u2', 'n1', {
              title: 'Ajena',
              text: '',
              minutes: 5,
            })
          : operation === 'notify'
            ? await repository.markNotified('u2', 'n1')
            : await repository.deleteNote('u2', 'n1');
      expect(result).toBe(operation === 'delete' ? false : null);
      expect(data.notes).toEqual([note]);
    },
  );

  it('elimina solamente la nota solicitada', async () => {
    data.notes = [{ ...note }, { ...note, id: 'n2' }];
    await expect(repository.deleteNote('u1', 'n1')).resolves.toBe(true);
    expect(data.notes.map((item) => item.id)).toEqual(['n2']);
    await expect(repository.deleteNote('u1', 'missing')).resolves.toBe(false);
  });
});
