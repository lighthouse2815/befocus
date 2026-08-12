import { resolveApiBaseUrl } from './env'

describe('resolveApiBaseUrl', () => {
  it('requires explicit configuration', () => {
    expect(resolveApiBaseUrl(undefined)).toBeNull()
    expect(resolveApiBaseUrl('  ')).toBeNull()
  })

  it('adds the shared API prefix to a LAN backend URL', () => {
    expect(resolveApiBaseUrl('http://192.168.1.20:8080/')).toBe('http://192.168.1.20:8080/api/v1')
  })

  it('does not duplicate an existing API prefix', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api/v1')).toBe('https://api.example.com/api/v1')
  })
})
