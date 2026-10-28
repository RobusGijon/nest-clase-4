import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

const minutesMessage ='Los minutos deben ser un numero entero mayor o igual a 1.';

export class CreateNoteDto {
  @ApiProperty({ example: 'Estudiar Nest', minLength: 1 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @IsNotEmpty({ message: 'El titulo es obligatorio.' })
  title!: string;

  @ApiPropertyOptional({ example: 'Repasar modulos y servicios', default: '' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  text: string = '';

  @ApiProperty({ type: 'integer', example: 15, minimum: 1 })
  @Transform(({ value }) => {
    if (typeof value !== 'string' && typeof value !== 'number') return NaN;
    if (typeof value === 'string' && value.trim() === '') return NaN;
    return Number(value);
  })
  @IsInt({ message: minutesMessage })
  @Min(1, { message: minutesMessage })
  minutes!: number;
}
