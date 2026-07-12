import { clampText, redactPii } from './pii-redactor';

describe('pii-redactor', () => {
  it('redacts email and phone', () => {
    const input = 'Liên hệ a@b.com hoặc 0912345678 nhé';
    const out = redactPii(input);
    expect(out).not.toContain('a@b.com');
    expect(out).not.toContain('0912345678');
    expect(out).toContain('[email]');
    expect(out).toContain('[phone]');
  });

  it('clamps long text', () => {
    expect(clampText('x'.repeat(10), 5).length).toBeLessThanOrEqual(6);
  });
});
