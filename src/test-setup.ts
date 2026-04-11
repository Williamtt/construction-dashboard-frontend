import { vi, beforeEach } from 'vitest'

/**
 * 在 vitest 環境下 localStorage 可能未完整初始化，
 * 以 vi.stubGlobal 提供符合 Storage interface 的 mock。
 */
const _store: Record<string, string> = {}

const localStorageMock: Storage = {
  getItem: (key: string) => _store[key] ?? null,
  setItem: (key: string, value: string) => {
    _store[key] = String(value)
  },
  removeItem: (key: string) => {
    delete _store[key]
  },
  clear: () => {
    Object.keys(_store).forEach((k) => delete _store[k])
  },
  get length() {
    return Object.keys(_store).length
  },
  key: (index: number) => Object.keys(_store)[index] ?? null,
}

vi.stubGlobal('localStorage', localStorageMock)

// 每個測試前清空，防止跨測試污染
beforeEach(() => {
  localStorageMock.clear()
})
