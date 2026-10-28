import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { createAppValidationPipe } from './validation.pipe.js';
import { SESSION_COOKIE } from './session.js';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(createAppValidationPipe());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API de notas')
      .setDescription('Notas y auth')
      .setVersion('1.0')
      .addCookieAuth(SESSION_COOKIE, { type: 'apiKey', in: 'cookie' }, SESSION_COOKIE)
      .build(),
  );

  SwaggerModule.setup('api/docs', app, document);
}
