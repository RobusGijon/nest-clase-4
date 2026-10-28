import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { JsonRepository } from '../repository/json.repository.js';

const note = {
  id: 'n1',
  title: 'Titulo',
  text: 'Texto',
  minutes: 5,
  createdAt: 100,
  notified: false,
};

describe('NotesService', () => {
  const repository = {
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    markNotified: vi.fn(),
    deleteNote: vi.fn(),
  };
  let service: NotesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new NotesService(repository as unknown as JsonRepository);
  });

  afterEach(() => vi.restoreAllMocks());

  it('lista solamente las notas del usuario recibido', async () => {
    repository.listNotes.mockResolvedValue([note]);
    await expect(service.getNotesFromUser('u1')).resolves.toEqual({
      notes: [note],
    });
    expect(repository.listNotes).toHaveBeenCalledWith('u1');
  });

  it('crea una nota con dueño, fecha y notified=false', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(100);
    repository.createNote.mockResolvedValue(note);
    const dto = { title: 'Titulo', text: 'Texto', minutes: 5 };
    await expect(service.createNoteFromUser('u1', dto)).resolves.toEqual({
      note,
    });
    expect(repository.createNote).toHaveBeenCalledWith({
      ...note,
      id: expect.any(String),
      userId: 'u1',
    });
  });

  it('actualiza los datos de la nota del usuario', async () => {
    repository.updateNote.mockResolvedValue(note);
    await expect(
      service.modifyNoteFromUser('u1', { ...note, notified: false }),
    ).resolves.toEqual({ note });
    expect(repository.updateNote).toHaveBeenCalledWith('u1', 'n1', {
      title: 'Titulo',
      text: 'Texto',
      minutes: 5,
    });
    expect(repository.markNotified).not.toHaveBeenCalled();
  });

  it('notified=true marca la nota sin editar sus datos', async () => {
    repository.markNotified.mockResolvedValue({ ...note, notified: true });
    await expect(
      service.modifyNoteFromUser('u1', {
        id: 'n1',
        notified: true,
      } as Parameters<NotesService['modifyNoteFromUser']>[1]),
    ).resolves.toEqual({ note: { ...note, notified: true } });
    expect(repository.markNotified).toHaveBeenCalledWith('u1', 'n1');
    expect(repository.updateNote).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'devuelve 404 si la nota a modificar no existe',
    async (notified) => {
      repository.updateNote.mockResolvedValue(null);
      repository.markNotified.mockResolvedValue(null);
      await expect(
        service.modifyNoteFromUser('u1', { ...note, notified }),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('elimina la nota del usuario', async () => {
    repository.deleteNote.mockResolvedValue(true);
    await expect(service.deleteNotesFromUser('u1', 'n1')).resolves.toEqual({
      ok: true,
    });
    expect(repository.deleteNote).toHaveBeenCalledWith('u1', 'n1');
  });

  it('devuelve 404 al eliminar una nota inexistente o ajena', async () => {
    repository.deleteNote.mockResolvedValue(false);
    await expect(
      service.deleteNotesFromUser('u1', 'n1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
