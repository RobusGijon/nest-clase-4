import { Body, Controller, Delete, Get, Patch, Post, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, 
    ApiCookieAuth, 
    ApiCreatedResponse, 
    ApiExtraModels, 
    ApiNotFoundResponse, 
    ApiOkResponse, 
    ApiOperation, 
    ApiParam, 
    ApiTags, 
    ApiUnauthorizedResponse, 
    getSchemaPath,
} from '@nestjs/swagger';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { ModifyNoteDto } from './dto/modify-note.dto.js';
import { SessionGuard } from '../lib/current-user.js';
import type { AuthenticatedRequest } from '../lib/current-user.js';
import { SESSION_COOKIE } from '../lib/session.js';
import { Note } from './entity/notes-entity.js';

const noteResponse = {
  type: 'object',
  properties: { note: { $ref: getSchemaPath(Note) } },
};

@ApiTags('Notes')
@ApiCookieAuth(SESSION_COOKIE)
@ApiExtraModels(Note)
@ApiUnauthorizedResponse({ description: 'No autorizado' })
@UseGuards(SessionGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar las notas propias, de mas nuevas a mas antiguas',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        notes: { type: 'array', items: { $ref: getSchemaPath(Note) } },
      },
    },
  })
  async getNotes(@Req() req: AuthenticatedRequest) {
    return this.notesService.getNotesFromUser(req.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nota' })
  @ApiCreatedResponse({ schema: noteResponse })
  @ApiBadRequestResponse({ description: 'Datos invalidos' })
  async create(@Body() dto: CreateNoteDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.createNoteFromUser(req.userId, dto);
  }

  @Patch()
  @ApiOperation({
    summary: 'Editar una nota o marcarla como notificada',
    description:
      `Para editar enviar: id, title, minutes y opcionalmente text. \nPara marcar enviar solamente id y notified: true.`,
  })
  @ApiOkResponse({ schema: noteResponse })
  @ApiBadRequestResponse({ description: 'Falta el id o datos invalidos' })
  @ApiNotFoundResponse({ description: 'Nota no encontrada' })
  async modify(@Body() dto: ModifyNoteDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.modifyNoteFromUser(req.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una nota propia' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  @ApiBadRequestResponse({ description: 'El id debe ser un UUID valido' })
  @ApiNotFoundResponse({ description: 'Nota no encontrada' })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notesService.deleteNotesFromUser(req.userId, id);
  }
}
