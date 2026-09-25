import type { PoolClient } from 'pg'
import { query, queryOne } from './db'

// Version history for content that admins edit (question sets, email flows).
// Every change saves a full snapshot, so any earlier version can be downloaded or restored. Snapshots are never
// deleted, and they are kept even if the thing they belong to is deleted, so a deleted flow can be brought back.

export type EntityType = 'question_set' | 'email_flow'
export type VersionRow = { id: number; version: number; note: string | null; created_by: string | null; created_at: Date; snapshot: unknown }

type Db = Pick<PoolClient, 'query'> | null

export async function saveVersion(db: Db, type: EntityType, entityId: string, snapshot: unknown, note: string, by: string | null): Promise<number> {
  const sql = `INSERT INTO content_versions (entity_type, entity_id, version, snapshot, note, created_by)
               SELECT $1, $2, coalesce(max(version), 0) + 1, $3, $4, $5 FROM content_versions WHERE entity_type = $1 AND entity_id = $2
               RETURNING version`
  const params = [type, entityId, JSON.stringify(snapshot), note.slice(0, 200), by]
  const row = db ? (await db.query<{ version: number }>(sql, params)).rows[0] : await queryOne<{ version: number }>(sql, params)
  return row?.version ?? 0
}

export async function listVersions(type: EntityType, entityId: string, limit = 100) {
  return query<Omit<VersionRow, 'snapshot'> & { size: number }>(
    `SELECT id, version, note, created_by, created_at, length(snapshot::text) AS size
       FROM content_versions WHERE entity_type = $1 AND entity_id = $2 ORDER BY version DESC LIMIT $3`,
    [type, entityId, limit],
  )
}

export async function getVersion(type: EntityType, entityId: string, version: number) {
  return queryOne<VersionRow>(`SELECT * FROM content_versions WHERE entity_type = $1 AND entity_id = $2 AND version = $3`, [type, entityId, version])
}

/** Entities that have history but no longer exist (e.g. deleted email flows), with their last snapshot. */
export async function orphanedVersions(type: EntityType, table: 'email_flows') {
  return query<{ entity_id: string; version: number; created_at: Date; snapshot: { flow?: { name?: string } } }>(
    `SELECT DISTINCT ON (v.entity_id) v.entity_id, v.version, v.created_at, v.snapshot
       FROM content_versions v
      WHERE v.entity_type = $1 AND NOT EXISTS (SELECT 1 FROM ${table} t WHERE t.id = v.entity_id)
      ORDER BY v.entity_id, v.version DESC`,
    [type],
  )
}

export function downloadJson(filename: string, data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
  })
}
