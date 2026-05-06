import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(
    firebaseUid: string,
    displayName?: string,
    email?: string,
  ): Promise<User> {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: { displayName, email },
      create: { firebaseUid, displayName, email },
    });
  }
}
