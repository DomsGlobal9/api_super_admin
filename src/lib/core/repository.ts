import { prisma as defaultPrisma } from '../prisma';
import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<TEntity> {
  protected readonly db: PrismaClient;

  constructor(db: PrismaClient = defaultPrisma) {
    this.db = db;
  }

  // Common repository methods can be abstracted here.
  // We avoid passing generic Prisma models directly due to strict typing challenges with Prisma delegates,
  // but we provide the DB accessor for derived repositories to use uniformly.
  
  protected get currentTimestamp() {
    return new Date();
  }
}
