/**
 * Durable chat log store.
 *
 * This module owns turn-by-turn chat transcripts for generated agents.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const CHATLOGS_DIR = path.join(DATA_DIR, 'chatlogs');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CHATLOGS_DIR)) fs.mkdirSync(CHATLOGS_DIR, { recursive: true });
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export function appendChatLog(tokenId: string | number, messages: ChatMessage[]): void {
  ensureDirs();
  const dir = path.join(CHATLOGS_DIR, String(tokenId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `${Date.now()}.jsonl`);
  const lines = messages.map((message) => JSON.stringify(message)).join('\n');
  fs.writeFileSync(file, lines, 'utf8');
}

export function getChatLogs(tokenId: string | number): ChatMessage[] {
  ensureDirs();
  const dir = path.join(CHATLOGS_DIR, String(tokenId));
  if (!fs.existsSync(dir)) return [];

  const results: ChatMessage[] = [];
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.jsonl')).sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const line of raw.split('\n').filter(Boolean)) {
      try {
        results.push(JSON.parse(line) as ChatMessage);
      } catch {
        // skip malformed log lines
      }
    }
  }

  return results;
}