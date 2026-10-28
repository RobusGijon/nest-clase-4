import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { AuthController } from './auth/auth.controller.js';
import { NotesController } from './notes/notes.controller.js';
import { JsonRepository } from './repository/json.repository.js';

describe('AppModule', () => {
  it('resuelve los controllers y comparte el repositorio entre auth y notas', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    try {
      expect(module.get(AuthController)).toBeInstanceOf(AuthController);
      expect(module.get(NotesController)).toBeInstanceOf(NotesController);
      expect(module.get(JsonRepository, { each: true })).toHaveLength(1);
    } finally {
      await module.close();
    }
  });
});
