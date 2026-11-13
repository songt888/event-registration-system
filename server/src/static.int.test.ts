import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';

// L5-02 (D-18): in the image the API serves the built UI from CLIENT_DIST.
describe('L5-02 built UI served by the API', () => {
  let dir: string;
  const before = process.env.CLIENT_DIST;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'client-dist-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>ui-marker-52</title>');
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("asset-52");');
    process.env.CLIENT_DIST = dir;
  });

  afterAll(() => {
    if (before === undefined) delete process.env.CLIENT_DIST;
    else process.env.CLIENT_DIST = before;
    rmSync(dir, { recursive: true, force: true });
  });

  it('TEST-52 AC-52 serves the UI page, UI routes and files, and keeps unknown /api paths as a JSON 404', async () => {
    const app = createApp();

    const root = await request(app).get('/');
    expect(root.status).toBe(200);
    expect(root.headers['content-type']).toMatch(/text\/html/);
    expect(root.text).toContain('ui-marker-52');

    const route = await request(app).get('/events/123');
    expect(route.status).toBe(200);
    expect(route.headers['content-type']).toMatch(/text\/html/);
    expect(route.text).toContain('ui-marker-52');

    const asset = await request(app).get('/assets/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('asset-52');

    const api = await request(app).get('/api/unknown');
    expect(api.status).toBe(404);
    expect(api.headers['content-type']).toMatch(/application\/json/);
    expect(api.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
    expect(api.text).not.toContain('ui-marker-52');
  });
});
