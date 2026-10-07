import { rmSync } from "node:fs"
import { DatabaseSync, type StatementSync } from "node:sqlite"
import type { ChatMessage } from "../shared/types"

// Bump to drop and rebuild the index from the transcripts on the next launch.
const VERSION = 1

const SCHEMA = `
  CREATE TABLE chats (
    chat_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL
  );
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    chat_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    text TEXT NOT NULL
  );
  CREATE INDEX entries_chat ON entries (chat_id, seq);
  CREATE INDEX entries_project ON entries (project_id);
  CREATE VIRTUAL TABLE entries_fts USING fts5 (
    text,
    content = 'entries',
    content_rowid = 'id',
    tokenize = 'trigram'
  );
  CREATE TRIGGER entries_insert AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts (rowid, text) VALUES (new.id, new.text);
  END;
  CREATE TRIGGER entries_delete AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts (entries_fts, rowid, text) VALUES ('delete', old.id, old.text);
  END;
`

export type SearchHit = {
  projectId: string
  chatId: string
  messageId: string
  text: string
}

type Entry = { messageId: string; text: string }

// Full-text index over the user and assistant text of every chat. The trigram
// tokenizer keeps the old substring semantics: "chats" matches "searchChats".
// Transcripts on disk stay the source of truth; this file can be deleted.
export class SearchIndex {
  private db: DatabaseSync
  private statements = new Map<string, StatementSync>()

  constructor(private readonly file: string) {
    this.db = this.open()
  }

  hasChat(chatId: string): boolean {
    return this.statement("SELECT 1 FROM chats WHERE chat_id = ?").get(chatId) !== undefined
  }

  indexedChats(): Map<string, string> {
    const rows = this.statement("SELECT chat_id, project_id FROM chats").all() as { chat_id: string; project_id: string }[]
    return new Map(rows.map((row) => [row.chat_id, row.project_id]))
  }

  // Reindexes only the messages from the first one that changed, so a
  // streaming reply rewrites its own row rather than the whole chat.
  indexChat(projectId: string, chatId: string, messages: ChatMessage[]): void {
    const next = searchable(messages)
    const stored = this.statement("SELECT seq, message_id, size FROM entries WHERE chat_id = ? ORDER BY seq").all(chatId) as {
      seq: number
      message_id: string
      size: number
    }[]
    let from = 0
    while (from < next.length && from < stored.length) {
      const row = stored[from]
      if (row.seq !== from || row.message_id !== next[from].messageId || row.size !== next[from].text.length) break
      from++
    }
    if (from === next.length && from === stored.length && this.hasChat(chatId)) return
    this.transaction(() => {
      this.statement("INSERT OR REPLACE INTO chats (chat_id, project_id) VALUES (?, ?)").run(chatId, projectId)
      this.statement("DELETE FROM entries WHERE chat_id = ? AND seq >= ?").run(chatId, from)
      const insert = this.statement("INSERT INTO entries (chat_id, project_id, seq, message_id, size, text) VALUES (?, ?, ?, ?, ?, ?)")
      for (let seq = from; seq < next.length; seq++) {
        const entry = next[seq]
        insert.run(chatId, projectId, seq, entry.messageId, entry.text.length, entry.text)
      }
    })
  }

  removeChat(chatId: string): void {
    this.transaction(() => {
      this.statement("DELETE FROM entries WHERE chat_id = ?").run(chatId)
      this.statement("DELETE FROM chats WHERE chat_id = ?").run(chatId)
    })
  }

  removeProject(projectId: string): void {
    this.transaction(() => {
      this.statement("DELETE FROM entries WHERE project_id = ?").run(projectId)
      this.statement("DELETE FROM chats WHERE project_id = ?").run(projectId)
    })
  }

  // The best-matching message of every chat where one message contains all
  // the terms. Terms under three characters can't use the trigram index, so
  // they filter the matched rows instead.
  search(terms: string[]): SearchHit[] {
    const long = terms.filter((term) => term.length >= 3)
    const short = terms.filter((term) => term.length < 3)
    if (long.length === 0) return []
    const match = long.map((term) => `"${term.replaceAll('"', '""')}"`).join(" ")
    const filters = short.map(() => "AND e.text LIKE ? ESCAPE '\\'").join(" ")
    const rows = this.statement(`
      SELECT project_id, chat_id, message_id, text FROM (
        SELECT e.project_id, e.chat_id, e.message_id, e.text, f.rank AS score,
          row_number() OVER (PARTITION BY e.chat_id ORDER BY f.rank) AS place
        FROM entries_fts f JOIN entries e ON e.id = f.rowid
        WHERE entries_fts MATCH ? ${filters}
      ) WHERE place = 1
    `).all(match, ...short.map((term) => `%${term.replace(/[\\%_]/g, "\\$&")}%`)) as {
      project_id: string
      chat_id: string
      message_id: string
      text: string
    }[]
    return rows.map((row) => ({ projectId: row.project_id, chatId: row.chat_id, messageId: row.message_id, text: row.text }))
  }

  private open(): DatabaseSync {
    try {
      return this.connect()
    } catch {
      // A corrupt or unreadable index is rebuilt from the transcripts.
      for (const suffix of ["", "-wal", "-shm"]) rmSync(`${this.file}${suffix}`, { force: true })
      return this.connect()
    }
  }

  private connect(): DatabaseSync {
    const db = new DatabaseSync(this.file)
    try {
      db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")
      const { user_version: version } = db.prepare("PRAGMA user_version").get() as { user_version: number }
      if (version !== VERSION) {
        db.exec("DROP TABLE IF EXISTS entries_fts; DROP TABLE IF EXISTS entries; DROP TABLE IF EXISTS chats;")
        db.exec(SCHEMA)
        db.exec(`PRAGMA user_version = ${VERSION}`)
      }
      return db
    } catch (error) {
      db.close()
      throw error
    }
  }

  private statement(sql: string): StatementSync {
    let statement = this.statements.get(sql)
    if (!statement) {
      statement = this.db.prepare(sql)
      this.statements.set(sql, statement)
    }
    return statement
  }

  private transaction(work: () => void): void {
    this.db.exec("BEGIN")
    try {
      work()
      this.db.exec("COMMIT")
    } catch (error) {
      this.db.exec("ROLLBACK")
      throw error
    }
  }
}

function searchable(messages: ChatMessage[]): Entry[] {
  const entries: Entry[] = []
  for (const message of messages) {
    if (message.role === "tool" || !message.text.trim()) continue
    entries.push({ messageId: message.id, text: message.text })
  }
  return entries
}
