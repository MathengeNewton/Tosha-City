import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { endOfDayInAppTz, startOfDayInAppTz } from '../../common/time/app-time';

export interface CreateActivityLogDto {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  success: boolean;
  errorMessage?: string | null;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private repo: Repository<ActivityLog>,
  ) {}

  async log(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const entry = this.repo.create({
      userId: dto.userId ?? null,
      action: dto.action,
      entityType: dto.entityType,
      entityId: dto.entityId ?? null,
      details: dto.details ?? null,
      success: dto.success,
      errorMessage: dto.errorMessage ?? null,
    });
    return await this.repo.save(entry);
  }

  async findAll(params: {
    dateFrom?: string;
    dateTo?: string;
    userId?: number;
    entityType?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ActivityLog[]; total: number }> {
    const query = this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (params.dateFrom) {
      const ymd = params.dateFrom.trim().split('T')[0];
      query.andWhere('log.createdAt >= :from', { from: startOfDayInAppTz(ymd) });
    }
    if (params.dateTo) {
      const ymd = params.dateTo.trim().split('T')[0];
      query.andWhere('log.createdAt <= :to', { to: endOfDayInAppTz(ymd) });
    }
    if (params.userId != null) {
      query.andWhere('log.userId = :userId', { userId: params.userId });
    }
    if (params.entityType) {
      query.andWhere('log.entityType = :entityType', {
        entityType: params.entityType,
      });
    }
    if (params.success !== undefined) {
      query.andWhere('log.success = :success', { success: params.success });
    }

    const total = await query.getCount();

    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;
    query.take(limit).skip(offset);

    const items = await query.getMany();
    return { items, total };
  }
}
