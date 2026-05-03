/**
 * Durable scrape artifact store.
 *
 * This module owns raw tweet bundles and their verification metadata.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCRAPES_DIR)) fs.mkdirSync(SCRAPES_DIR, { recursive: true });
}

export type ScrapeArtifact = {
  handle: string;
  tweets: unknown[];
  verification: unknown;
  createdAt: string;
};

function scrapePath(handle: string, createdAt: string) {
  const safe = handle.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const dir = path.join(SCRAPES_DIR, safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stamp = createdAt.replace(/[:.]/g, '-');
  return path.join(dir, `${stamp}.json`);
}

export function saveScrapeArtifact(artifact: ScrapeArtifact): void {
  ensureDirs();
  fs.writeFileSync(scrapePath(artifact.handle, artifact.createdAt), JSON.stringify(artifact, null, 2), 'utf8');
}

export function getScrapeArtifacts(handle: string): ScrapeArtifact[] {
  ensureDirs();
  const safe = handle.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const dir = path.join(SCRAPES_DIR, safe);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).sort();
  const results: ScrapeArtifact[] = [];

  for (const file of files) {
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as ScrapeArtifact);
    } catch {
      // skip corrupt file
    }
  }

  return results;
}