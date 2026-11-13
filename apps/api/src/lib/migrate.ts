export function migrate(storage: DurableObjectStorage, migrations: string[]) {
  const version = storage.kv.get<number>("version") ?? 0
  if (version === migrations.length) return
  storage.transactionSync(() => {
    for (const migration of migrations.slice(version)) storage.sql.exec(migration)
    storage.kv.put("version", migrations.length)
  })
}
