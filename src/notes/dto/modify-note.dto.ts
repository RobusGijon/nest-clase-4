import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';

export class ModifyNoteDto {
  @ApiProperty({ example: 'ba4f9e55-51c9-4ad2-8ca7-dfa9ed3c68e1', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty({ message: 'Falta el id' })
  id!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'true marca la nota como notificada sin editarla.',
  })
  @IsOptional()
  @IsBoolean()
  notified?: boolean;

  @ApiPropertyOptional({
    example: 'Estudiar Nest',
    description: 'Obligatorio al editar (notified distinto de true).',
  })
  @ValidateIf((o: ModifyNoteDto) => o.notified !== true)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsNotEmpty({ message: 'El titulo es obligatorio.' })
  title!: string;

  @ApiPropertyOptional({ example: 'Repasar modulos y servicios', default: '' })
  @ValidateIf((o: ModifyNoteDto) => o.notified !== true)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  text: string = '';

  @ApiPropertyOptional({
    type: 'integer',
    example: 15,
    minimum: 1,
    description: 'Obligatorio al editar (notified distinto de true).',
  })
  @ValidateIf((o: ModifyNoteDto) => o.notified !== true)
  @Transform(({ value }) => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    if (typeof value === 'string' && value.trim() === '') return NaN;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  minutes!: number;
}
