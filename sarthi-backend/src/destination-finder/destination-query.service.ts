import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

@Injectable()
export class DestinationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findShortlist(dto: SearchDestinationsDto) {
    const months = this.extractMonths(dto.dates.from, dto.dates.to);

    return this.prisma.destination.findMany({
      where: {
        experienceTypes: { hasSome: dto.experienceTypes },
        budgetMin: { lte: dto.budget.max },
        budgetMax: { gte: dto.budget.min },
        bestMonths: { hasSome: months },
      },
      take: 15,
    });
  }

  private extractMonths(from: string, to: string): number[] {
    const start = new Date(from);
    const end = new Date(to);
    const months = new Set<number>();

    months.add(start.getMonth() + 1);

    const current = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (current <= end) {
      months.add(current.getMonth() + 1);
      current.setMonth(current.getMonth() + 1);
    }

    return Array.from(months);
  }
}
