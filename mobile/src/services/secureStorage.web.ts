const memory = new Map<string, string>()

function storage() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

export const secureStorage = {
  async get(key: string) {
    return storage()?.getItem(key) ?? memory.get(key) ?? null
  },
  async set(key: string, value: string) {
    storage()?.setItem(key, value)
    memory.set(key, value)
  },
  async remove(key: string) {
    storage()?.removeItem(key)
    memory.delete(key)
  },
}
