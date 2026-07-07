const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

export const vietnamDate = {
  /** 'YYYY-MM-DD' string in Vietnam timezone (UTC+7) */
  toDateString(date: Date): string {
    return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
  },

  /** Day of week (0=Sun…6=Sat) in Vietnam timezone */
  dayOfWeek(date: Date): number {
    return new Date(date.getTime() + VN_OFFSET_MS).getUTCDay();
  },

  /** Start of today in Vietnam timezone (00:00:00 +07:00) returned as UTC Date */
  startOfToday(): Date {
    const vnDateStr = new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
    return new Date(`${vnDateStr}T00:00:00+07:00`);
  },

  /** End of today in Vietnam timezone (23:59:59.999 +07:00) returned as UTC Date */
  endOfToday(): Date {
    const vnDateStr = new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
    return new Date(`${vnDateStr}T23:59:59.999+07:00`);
  },
};
