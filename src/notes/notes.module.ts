import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SessionGuard } from '../lib/current-user.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [NotesController],
  providers: [NotesService, SessionGuard],
})
export class NotesModule {}
