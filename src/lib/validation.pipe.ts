import { BadRequestException, ValidationPipe } from '@nestjs/common';

export function createAppValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    exceptionFactory: (errors) => {
      const message =
        errors.flatMap((error) => Object.values(error.constraints ?? {}))[0] ??
        'Datos invalidos';
      return new BadRequestException(message);
    },
  });
}
