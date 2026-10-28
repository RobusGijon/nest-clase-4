import { Injectable, NotFoundException } from '@nestjs/common';
import { JsonRepository } from '../repository/json.repository.js';
import { randomUUID } from 'crypto';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { ModifyNoteDto } from './dto/modify-note.dto.js';

@Injectable()
export class NotesService {
  constructor(private readonly repository: JsonRepository) {}

  async getNotesFromUser(userId: string) {
    return { notes: await this.repository.listNotes(userId) };
  }

  async createNoteFromUser(userId: string, dto: CreateNoteDto) {
    const note = await this.repository.createNote({
      id: randomUUID(),
      userId,
      title: dto.title,
      text: dto.text,
      minutes: dto.minutes,
      createdAt: Date.now(),
      notified: false,
    });

    return { note };
  }

  async modifyNoteFromUser(userId: string, dto: ModifyNoteDto) {
    let note;

    if (dto.notified === true) {
      note = await this.repository.markNotified(userId, dto.id);
    } else {
      note = await this.repository.updateNote(userId, dto.id, {
        title: dto.title,
        text: dto.text,
        minutes: dto.minutes,
      });
    }

    if (!note) throw new NotFoundException('Nota no encontrada');

    return { note };
  }

  async deleteNotesFromUser(userId: string, id: string) {
    const deleted = await this.repository.deleteNote(userId, id);
    if (!deleted) throw new NotFoundException('Nota no encontrada');
    return { ok: true };
  }
}
