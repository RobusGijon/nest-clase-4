import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'robus@example.com', format: 'email' })
  @IsEmail({}, { message: 'El email debe ser valido.' })
  @IsNotEmpty({ message: 'El email no debe estar vacio.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;

  @ApiProperty({ example: 'Mi clave 123', format: 'password' })
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña no debe estar vacia.' })
  password: string;
}
