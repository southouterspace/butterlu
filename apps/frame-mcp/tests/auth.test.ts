import { describe, expect, test } from 'bun:test';
import { authorizeMcpRequest, timingSafeEqual } from '../src/auth';
import type { Env } from '../src/env';

const env = (token?: string) => ({ MCP_TOKEN: token }) as unknown as Env;
const req = (auth?: string) => new Request('https://frame.example/mcp', { method: 'POST', headers: auth ? { authorization: auth } : {} });

describe('authorizeMcpRequest', () => {
  test('fails closed when MCP_TOKEN is not set', () => {
    expect(authorizeMcpRequest(req('Bearer anything'), env())?.status).toBe(503);
    expect(authorizeMcpRequest(req('Bearer anything'), env('   '))?.status).toBe(503);
  });

  test('refuses a missing, malformed or wrong token', () => {
    expect(authorizeMcpRequest(req(), env('s3cret'))?.status).toBe(401);
    expect(authorizeMcpRequest(req('s3cret'), env('s3cret'))?.status).toBe(401);
    expect(authorizeMcpRequest(req('Bearer s3cre'), env('s3cret'))?.status).toBe(401);
    expect(authorizeMcpRequest(req('Bearer s3cret!'), env('s3cret'))?.status).toBe(401);
  });

  test('lets the right token through, case-insensitive scheme', () => {
    expect(authorizeMcpRequest(req('Bearer s3cret'), env('s3cret'))).toBeUndefined();
    expect(authorizeMcpRequest(req('bearer s3cret'), env('s3cret'))).toBeUndefined();
  });
});

test('timingSafeEqual', () => {
  expect(timingSafeEqual('abc', 'abc')).toBe(true);
  expect(timingSafeEqual('abd', 'abc')).toBe(false);
  expect(timingSafeEqual('ab', 'abc')).toBe(false);
  expect(timingSafeEqual('abcd', 'abc')).toBe(false);
});
