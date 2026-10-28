import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoredNote } from '../notes/entity/notes-entity.js';

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

type Database = {
  users: User[];
  notes: StoredNote[];
};

@Injectable()
export class JsonDB {
  private queue: Promise<unknown> = Promise.resolve();

  filePath(): string {
    return process.env.DATA_FILE ?? path.join(process.cwd(), 'data', 'db.json');
  }

  async read(): Promise<Database> {
    try {
      const filePath = this.filePath();
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<Database>;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { users: [], notes: [] };
      }
      throw error;
    }
  }

  async write(data: Database): Promise<void> {
    const filePath = this.filePath();
    const temporary = `${filePath}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(temporary, JSON.stringify(data, null, 2));
    await fs.rename(temporary, filePath);
  }

  update<T>(change: (data: Database) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = change(data);
      await this.write(data);
      return result;
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
