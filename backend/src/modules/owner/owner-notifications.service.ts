import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { OwnerDevice } from './entities/owner-device.entity';
import { OwnerNotification } from './entities/owner-notification.entity';
import { SessionStatus, StockSession } from '../stock-sessions/entities/stock-session.entity';
import { OwnerSummaryService } from './owner-summary.service';
import { OwnerAlertsService } from './owner-alerts.service';
import {
  addDaysYmd,
  getAppTimeZone,
  parseYmdToDate,
  todayYmdInAppTz,
  ymdInTimeZone,
} from '../../common/time/app-time';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Ignore events older than this so a first deploy doesn't send a backlog. */
const RECENT_MS = 2 * 60 * 60 * 1000;
const EVENING_FALLBACK_HOUR = 21;
const MAX_ALERT_PUSHES_PER_TICK = 3;

type PushMessage = { title: string; body: string; data?: Record<string, unknown> };

const kes = (n: number | null | undefined) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

export function sessionYmd(date: Date | string): string {
  return typeof date === 'string' ? date.slice(0, 10) : ymdInTimeZone(date);
}

export function formatSummaryPush(
  summary: Awaited<ReturnType<OwnerSummaryService['getDailySummary']>>,
  stillOpen: boolean,
): PushMessage {
  const parts = [
    `Sales ${kes(summary.sales.total)}`,
    `Cash in drawer ${kes(summary.drawer.expectedCash)}`,
    `M-Pesa ${kes(summary.drawer.netMpesa)}`,
  ];
  if (summary.sales.credit > 0) parts.push(`Credit ${kes(summary.sales.credit)}`);
  if (summary.expenses.total > 0) parts.push(`Expenses ${kes(summary.expenses.total)}`);
  const check = summary.stockCheck;
  if (check && check.status !== 'PENDING' && check.difference != null) {
    parts.push(
      check.status === 'BALANCED'
        ? 'Stock balanced'
        : `Stock ${check.status} ${kes(Math.abs(check.difference))}`,
    );
  }
  return {
    title: stillOpen ? `Today so far (session still open)` : `Day closed · ${summary.date}`,
    body: parts.join(' · '),
    data: { screen: 'today', date: summary.date },
  };
}

@Injectable()
export class OwnerNotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OwnerNotificationsService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectRepository(OwnerDevice) private deviceRepo: Repository<OwnerDevice>,
    @InjectRepository(OwnerNotification) private sentRepo: Repository<OwnerNotification>,
    @InjectRepository(StockSession) private sessionRepo: Repository<StockSession>,
    private summaryService: OwnerSummaryService,
    private alertsService: OwnerAlertsService,
  ) {}

  onModuleInit() {
    if (process.env.OWNER_PUSH_ENABLED === 'false') return;
    const interval = parseInt(process.env.OWNER_PUSH_INTERVAL_MS || '', 10) || 5 * 60 * 1000;
    this.timer = setInterval(() => {
      this.tick().catch((e) => this.logger.error(`Owner push check failed: ${e?.message ?? e}`));
    }, interval);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async registerDevice(userId: number, token: string, platform = 'android') {
    const existing = await this.deviceRepo.findOne({ where: { expoPushToken: token } });
    if (existing) {
      await this.deviceRepo.update(existing.id, { userId, platform, lastSeenAt: new Date() });
      return { registered: true };
    }
    await this.deviceRepo.save(this.deviceRepo.create({ userId, expoPushToken: token, platform }));
    return { registered: true };
  }

  async removeDevice(userId: number, token: string) {
    await this.deviceRepo.delete({ userId, expoPushToken: token });
    return { removed: true };
  }

  async sendTest(userId: number) {
    const devices = await this.deviceRepo.find({ where: { userId } });
    if (!devices.length) return { sent: 0 };
    await this.push(devices, {
      title: 'Notifications are working',
      body: 'You will get the evening summary and serious warnings here.',
      data: { screen: 'today' },
    });
    return { sent: devices.length };
  }

  /** Runs on a timer: session-closed summaries, the 9 pm fallback, and serious warnings. */
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const devices = await this.deviceRepo.find();
      if (!devices.length) return;
      await this.sendClosedSessionSummaries(devices);
      await this.sendEveningFallback(devices);
      await this.sendSeriousAlerts(devices);
    } finally {
      this.running = false;
    }
  }

  private async sendClosedSessionSummaries(devices: OwnerDevice[]) {
    const sessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.CLOSED,
        closedAt: MoreThanOrEqual(new Date(Date.now() - RECENT_MS)),
      },
    });
    for (const session of sessions) {
      const key = `summary:session:${session.id}`;
      if (await this.alreadySent(key)) continue;
      const summary = await this.summaryService.getDailySummary(sessionYmd(session.date));
      await this.pushOnce(key, devices, formatSummaryPush(summary, false));
    }
  }

  private async sendEveningFallback(devices: OwnerDevice[]) {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: getAppTimeZone(), hour: '2-digit', hour12: false }).format(new Date()),
      10,
    );
    if (hour < EVENING_FALLBACK_HOUR) return;

    const today = todayYmdInAppTz();
    const key = `summary:day:${today}`;
    if (await this.alreadySent(key)) return;

    const sessions = await this.sessionRepo.find({ where: { date: parseYmdToDate(today) } });
    if (!sessions.some((s) => s.status === SessionStatus.OPEN)) return;
    const closedKeys = sessions
      .filter((s) => s.status === SessionStatus.CLOSED)
      .map((s) => `summary:session:${s.id}`);
    if (closedKeys.length && (await this.sentRepo.count({ where: { key: In(closedKeys) } }))) return;

    const summary = await this.summaryService.getDailySummary(today);
    await this.pushOnce(key, devices, formatSummaryPush(summary, true));
  }

  private async sendSeriousAlerts(devices: OwnerDevice[]) {
    const today = todayYmdInAppTz();
    const { alerts } = await this.alertsService.getAlerts(addDaysYmd(today, -1), today);
    const cutoff = Date.now() - RECENT_MS;
    const fresh: typeof alerts = [];
    for (const alert of alerts) {
      // Stock shortages already arrive in the session-closed summary.
      if (alert.severity !== 'HIGH' || alert.type === 'STOCK_SHORT') continue;
      if (new Date(alert.date).getTime() < cutoff) continue;
      if (await this.alreadySent(`alert:${alert.id}`)) continue;
      fresh.push(alert);
    }
    if (!fresh.length) return;

    if (fresh.length > MAX_ALERT_PUSHES_PER_TICK) {
      const key = `alerts:batch:${fresh.map((a) => a.id).join(',')}`.slice(0, 250);
      await this.pushOnce(key, devices, {
        title: `${fresh.length} serious warnings`,
        body: fresh.slice(0, 3).map((a) => a.title).join(' · '),
        data: { screen: 'alerts' },
      });
      for (const alert of fresh) await this.markSent(`alert:${alert.id}`, alert.title, '');
      return;
    }
    for (const alert of fresh) {
      await this.pushOnce(`alert:${alert.id}`, devices, {
        title: alert.title,
        body: [alert.detail?.split('\n')[0], alert.user ? `By ${alert.user}` : null].filter(Boolean).join(' · ') || 'Open the app for details',
        data: { screen: 'alerts', alertId: alert.id },
      });
    }
  }

  private async alreadySent(key: string) {
    return (await this.sentRepo.count({ where: { key } })) > 0;
  }

  private async markSent(key: string, title: string, body: string) {
    await this.sentRepo.save(this.sentRepo.create({ key, title, body }));
  }

  private async pushOnce(key: string, devices: OwnerDevice[], message: PushMessage) {
    await this.push(devices, message);
    await this.markSent(key, message.title, message.body);
  }

  private async push(devices: OwnerDevice[], message: PushMessage) {
    const payload = devices.map((d) => ({
      to: d.expoPushToken,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    for (let i = 0; i < payload.length; i += 100) {
      const chunk = payload.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk) });
      if (!res.ok) throw new Error(`Expo push failed: ${res.status} ${await res.text()}`);
      const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
      const dead = (json.data ?? [])
        .map((ticket, idx) => (ticket.details?.error === 'DeviceNotRegistered' ? chunk[idx].to : null))
        .filter((t): t is string => !!t);
      if (dead.length) await this.deviceRepo.delete({ expoPushToken: In(dead) });
    }
  }
}
