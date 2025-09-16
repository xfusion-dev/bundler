import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://ddyou-dqaaa-aaaae-qfyda-cai.icp0.io',
      '*' // Allow all origins for development
    ],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Resolver API running on http://localhost:${port}`);
  console.log(`📍 Health check: http://localhost:${port}/resolver/health`);
}
bootstrap();
