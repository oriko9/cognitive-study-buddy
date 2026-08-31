import { describe, expect, it } from 'vitest';
import { readClientEnv, readServerEnv } from './env';

const completeClientEnv = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
};

describe('readClientEnv', () => {
  it('returns the parsed values when every required variable is present', () => {
    const result = readClientEnv(completeClientEnv);

    expect(result).toEqual({
      ok: true,
      data: { supabaseUrl: 'https://project.supabase.co', supabaseAnonKey: 'anon-key' },
    });
  });

  it('names the single missing variable rather than failing generically', () => {
    const result = readClientEnv({ VITE_SUPABASE_URL: 'https://project.supabase.co' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('VITE_SUPABASE_ANON_KEY');
    expect(result.error).not.toContain('VITE_SUPABASE_URL');
    expect(result.error).toContain('variable:');
  });

  it('names every missing variable when more than one is absent', () => {
    const result = readClientEnv({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('VITE_SUPABASE_URL');
    expect(result.error).toContain('VITE_SUPABASE_ANON_KEY');
    expect(result.error).toContain('variables:');
  });

  it('treats a whitespace-only value as missing', () => {
    const result = readClientEnv({ ...completeClientEnv, VITE_SUPABASE_ANON_KEY: '   ' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('VITE_SUPABASE_ANON_KEY');
  });

  it('trims surrounding whitespace off an accepted value', () => {
    const result = readClientEnv({ ...completeClientEnv, VITE_SUPABASE_URL: '  https://x.co  ' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.data.supabaseUrl).toBe('https://x.co');
  });
});

describe('readServerEnv', () => {
  it('returns the key when it is present server-side', () => {
    const result = readServerEnv({ GEMINI_API_KEY: 'AQ.server-side-key' });

    expect(result).toEqual({ ok: true, data: { geminiApiKey: 'AQ.server-side-key' } });
  });

  it('rejects a provider key carrying the VITE_ prefix, which Vite would inline into the bundle', () => {
    const result = readServerEnv({ VITE_GEMINI_API_KEY: 'AQ.leaked-into-the-client' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('VITE_GEMINI_API_KEY');
    expect(result.error).toContain('client bundle');
  });

  it('rejects the VITE_ prefixed key even when the correct variable is also set', () => {
    const result = readServerEnv({
      GEMINI_API_KEY: 'AQ.server-side-key',
      VITE_GEMINI_API_KEY: 'AQ.leaked-into-the-client',
    });

    expect(result.ok).toBe(false);
  });

  it('never echoes the secret value back in the error message', () => {
    const result = readServerEnv({ VITE_GEMINI_API_KEY: 'AQ.leaked-into-the-client' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).not.toContain('AQ.leaked-into-the-client');
  });

  it('reports the missing key by name when nothing is set', () => {
    const result = readServerEnv({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('GEMINI_API_KEY');
  });
});
