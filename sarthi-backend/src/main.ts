import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ensureDatabase } from './ensure-db';

async function bootstrap() {
  await ensureDatabase();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: '*' });
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
