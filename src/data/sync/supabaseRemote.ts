import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from '../dexie/db'
import type { Pulled } from './mappers'
import { RemoteSyncError, type RemoteStore, type RowsByTable } from './remote'

/** Postgres name of each synced table (snake_case, unlike the local Dexie tables). */
const REMOTE_TABLES: Record<SyncTable, string> = {
  projects: 'projects',
  tasks: 'tasks',
  docItems: 'doc_items',
}

export function createSupabaseRemote(client: SupabaseClient): RemoteStore {
  return {
    async pull<T extends SyncTable>(table: T, since: string | undefined, limit: number) {
      let query = client.from(REMOTE_TABLES[table]).select('*')
      if (since) query = query.gte('synced_at', since)
      const { data, error } = await query
        .order('synced_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (error) throw new RemoteSyncError(error.message, error.code)
      return (data ?? []) as Pulled<RowsByTable[T]>[]
    },

    async push(table, rows) {
      if (!rows.length) return
      // `user_id` defaults to auth.uid() on insert; the trigger skips versions that are not newer.
      const { error } = await client
        .from(REMOTE_TABLES[table])
        .upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw new RemoteSyncError(error.message, error.code)
    },

    subscribe(userId, onChange) {
      const filter = `user_id=eq.${userId}`
      let channel = client.channel(`shipyard-sync-${userId}`)
      for (const table of Object.values(REMOTE_TABLES)) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter },
          onChange,
        )
      }
      channel.subscribe((status) => {
        // Changes may have been missed while the channel was down.
        if (status === 'SUBSCRIBED') onChange()
      })
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
