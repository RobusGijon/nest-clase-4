import { ApiProperty } from '@nestjs/swagger';

export class Note {
  @ApiProperty({ example: 'ba4f9e55-51c9-4ad2-8ca7-dfa9ed3c68e1' })
  id: string;

  @ApiProperty({ example: 'Estudiar Nest' })
  title: string;

  @ApiProperty({ example: 'Repasar modulos y servicios' })
  text: string;

  @ApiProperty({ type: 'integer', example: 15, minimum: 1 })
  minutes: number;

  @ApiProperty({
    example: 1793199600000,
    description: 'Fecha de creacion o ultima edicion en milisegundos Unix',
  })
  createdAt: number;

  @ApiProperty({ example: false })
  notified: boolean;
}

export function isExpired(note: Note, now: number) {
  return now >= note.createdAt + note.minutes * 60_000;
}

export type StoredNote = Note & { userId: string };
