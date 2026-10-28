import { Injectable } from '@nestjs/common';
import { JsonDB } from '../database/json-db.js';
import type { User } from '../database/json-db.js';
import type { Note, StoredNote } from '../notes/entity/notes-entity.js';

@Injectable()
export class JsonRepository {
  constructor(private readonly jsonDB: JsonDB) {}

  private toPublic(note: StoredNote): Note {
    return {
      id: note.id,
      title: note.title,
      text: note.text,
      minutes: note.minutes,
      createdAt: note.createdAt,
      notified: note.notified,
    };
  }

  async findUserByEmail(email: string) {
    const data = await this.jsonDB.read();
    return data.users.find((user) => user.email === email) ?? null;
  }

  createUser(user: User) {
    return this.jsonDB.update((data) => {
      if (data.users.some((item) => item.email === user.email)) return null;
      data.users.push(user);
      return user;
    });
  }

  async findUserById(id: string) {
    const data = await this.jsonDB.read();
    return data.users.find((user) => user.id === id) ?? null;
  }

  async listNotes(userId: string) {
    const data = await this.jsonDB.read();
    return data.notes
      .filter((note) => note.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(this.toPublic);
  }

  createNote(note: StoredNote) {
    return this.jsonDB.update((data) => {
      data.notes.unshift(note);
      return this.toPublic(note);
    });
  }

  updateNote(
    userId: string,
    id: string,
    values: { title: string; text: string; minutes: number },
  ) {
    return this.jsonDB.update((data) => {
      const note = data.notes.find(
        (item) => item.id === id && item.userId === userId,
      );
      if (!note) return null;
      note.title = values.title;
      note.text = values.text;
      note.minutes = values.minutes;
      note.createdAt = Date.now();
      note.notified = false;
      return this.toPublic(note);
    });
  }

  markNotified(userId: string, id: string) {
    return this.jsonDB.update((data) => {
      const note = data.notes.find(
        (item) => item.id === id && item.userId === userId,
      );
      if (!note) return null;
      note.notified = true;
      return this.toPublic(note);
    });
  }

  deleteNote(userId: string, id: string) {
    return this.jsonDB.update((data) => {
      const index = data.notes.findIndex(
        (item) => item.id === id && item.userId === userId,
      );
      if (index === -1) return false;
      data.notes.splice(index, 1);
      return true;
    });
  }
}
