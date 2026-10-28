import type { Type } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { createAppValidationPipe } from './validation.pipe.js';
import { LoginDto } from '../auth/dto/login.dto.js';
import { RegisterDto } from '../auth/dto/register.dto.js';
import { CreateNoteDto } from '../notes/dto/create-note.dto.js';
import { ModifyNoteDto } from '../notes/dto/modify-note.dto.js';

function parse<T>(metatype: Type<T>, value: unknown): Promise<T> {
  return createAppValidationPipe().transform(value, { type: 'body', metatype });
}

const noteId = 'ba4f9e55-51c9-4ad2-8ca7-dfa9ed3c68e1';

const registration = {
  name: ' Robus ',
  email: ' ROBUS@example.com ',
  password: ' AbC123 ',
};

describe('DTOs y ValidationPipe', () => {
  it('recorta nombre y email, conserva la contraseña y descarta campos extra', async () => {
    await expect(
      parse(RegisterDto, { ...registration, admin: true }),
    ).resolves.toEqual({
      name: 'Robus',
      email: 'ROBUS@example.com',
      password: ' AbC123 ',
    });
    await expect(
      parse(LoginDto, {
        email: registration.email,
        password: registration.password,
      }),
    ).resolves.toEqual({ email: 'ROBUS@example.com', password: ' AbC123 ' });
  });

  it.each([
    { name: '   ' },
    { name: 123 },
    { name: null },
    { email: 'invalido' },
    { email: null },
    { password: 123456 },
    { password: null },
    { password: '12345' },
  ])('rechaza datos de registro invalidos: %j', async (invalid) => {
    await expect(
      parse(RegisterDto, { ...registration, ...invalid }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { email: '' },
    { email: 'sin-arroba' },
    { password: '' },
    { password: 123456 },
  ])('rechaza un login invalido: %j', async (invalid) => {
    await expect(
      parse(LoginDto, {
        email: 'r@example.com',
        password: '123456',
        ...invalid,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve message como string para que lo pueda mostrar el frontend', async () => {
    try {
      await parse(RegisterDto, { ...registration, name: ' ' });
      throw new Error('La validacion debia fallar');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    }
  });

  it.each([CreateNoteDto, ModifyNoteDto])(
    '%s recorta texto y acepta minutos numericos',
    async (dto) => {
      const result = await parse(dto, {
        id: noteId,
        title: ' Titulo ',
        text: ' Texto ',
        minutes: ' 3 ',
      });
      expect(result).toMatchObject({
        title: 'Titulo',
        text: 'Texto',
        minutes: 3,
      });
    },
  );

  it.each([CreateNoteDto, ModifyNoteDto])(
    '%s considera vacio el texto omitido',
    async (dto) => {
      expect(
        await parse(dto, { id: noteId, title: 'Titulo', minutes: 1 }),
      ).toMatchObject({ text: '' });
    },
  );

  it.each([
    undefined,
    null,
    '',
    ' ',
    'abc',
    0,
    -1,
    1.5,
    true,
    false,
    [],
    [1],
    {},
    Infinity,
  ])('rechaza minutos invalidos al crear y editar: %j', async (minutes) => {
    for (const dto of [CreateNoteDto, ModifyNoteDto]) {
      await expect(
        parse(dto, { id: noteId, title: 'Titulo', minutes }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('rechaza titulos vacios', async () => {
    await expect(
      parse(CreateNoteDto, { title: ' ', minutes: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite marcar notified sin titulo ni minutos', async () => {
    await expect(
      parse(ModifyNoteDto, { id: noteId, notified: true }),
    ).resolves.toMatchObject({ id: noteId, notified: true });
  });

  it.each([
    'n1',
    'ba4f9e55-51c9-0ad2-8ca7-dfa9ed3c68e1',
    'ba4f9e55-51c9-4ad2-8ca7-dfa9ed3c68ez',
    123,
    null,
    [noteId],
  ])('rechaza ids que no son UUID al editar y marcar: %j', async (id) => {
    await expect(
      parse(ModifyNoteDto, { id, title: 'Titulo', minutes: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      parse(ModifyNoteDto, { id, notified: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige id al marcar y titulo/minutos al editar', async () => {
    await expect(
      parse(ModifyNoteDto, { notified: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      parse(ModifyNoteDto, { id: noteId, notified: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
