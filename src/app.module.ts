import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { NotesModule } from './notes/notes.module.js';

@Module({
  imports: [AuthModule, NotesModule],
})
export class AppModule {}
