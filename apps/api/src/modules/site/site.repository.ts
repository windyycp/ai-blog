import { queryContext, type DbPort } from '../../db/port'

export function createSiteRepository(port: DbPort) {
  const { db, s } = queryContext(port)

  return {
    /** site_meta 是 key/value 表，一次性读全，避免多次往返 */
    async keyValues(): Promise<Map<string, string>> {
      const rows = await db.select({ key: s.siteMeta.key, value: s.siteMeta.value }).from(s.siteMeta)
      return new Map(rows.map((r) => [r.key, r.value]))
    },
  }
}
