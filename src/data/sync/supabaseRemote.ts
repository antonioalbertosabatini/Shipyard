import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from '../dexie/db'
import type { Pulled } from './mappers'
import { RemoteSyncError, type RemoteStore, type RowsByTable } from './remote'

export function createSupabaseRemote(client: SupabaseClient): RemoteStore {
  return {
    async pull<T extends SyncTable>(table: T, since: string | undefined, limit: number) {
      let query = client.from(table).select('*')
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
      const { error } = await client.from(table).upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw new RemoteSyncError(error.message, error.code)
    },

    subscribe(userId, onChange) {
      const filter = `user_id=eq.${userId}`
      const channel = client
        .channel(`shipyard-sync-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter },
          onChange,
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, onChange)
        .subscribe((status) => {
          // Changes may have been missed while the channel was down.
          if (status === 'SUBSCRIBED') onChange()
        })
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
