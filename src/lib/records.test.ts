import { describe, expect, test } from 'vitest'
import { applyOps, formatJst, parseRecords, serializeRecords, toJstIso } from './records'
import type { Room } from './rooms'

const ROOMS: Room[] = [
  { floor: '33F', room: 3301, type: 'ST3', task: 'bypass' },
  { floor: '33F', room: 13302, type: 'S2', task: 'gr' },
  { floor: '33F', room: 3303, type: 'SK2', task: 'bypass' },
]

describe('applyOps', () => {
  test('adds a completion time for a room marked done', () => {
    const result = applyOps({}, [{ room: 3301, doneAt: '2026-11-13T10:00:00+09:00' }])

    expect(result).toEqual({ 3301: '2026-11-13T10:00:00+09:00' })
  })

  test('removes the record when a room is undone', () => {
    const base = { 3301: '2026-11-13T10:00:00+09:00', 3303: '2026-11-13T10:05:00+09:00' }

    const result = applyOps(base, [{ room: 3301, doneAt: null }])

    expect(result).toEqual({ 3303: '2026-11-13T10:05:00+09:00' })
  })

  test('applies ops in order so a redo after an undo keeps the later time', () => {
    const result = applyOps({}, [
      { room: 3301, doneAt: '2026-11-13T10:00:00+09:00' },
      { room: 3301, doneAt: null },
      { room: 3301, doneAt: '2026-11-13T10:20:00+09:00' },
    ])

    expect(result).toEqual({ 3301: '2026-11-13T10:20:00+09:00' })
  })

  test('does not mutate the base records', () => {
    const base = { 3301: '2026-11-13T10:00:00+09:00' }

    applyOps(base, [{ room: 3301, doneAt: null }])

    expect(base).toEqual({ 3301: '2026-11-13T10:00:00+09:00' })
  })
})

describe('toJstIso', () => {
  test('converts a UTC instant to Japan time with a +09:00 offset', () => {
    expect(toJstIso(new Date('2026-11-13T01:42:17Z'))).toBe('2026-11-13T10:42:17+09:00')
  })

  test('rolls over to the next day in Japan while UTC is still the previous day', () => {
    expect(toJstIso(new Date('2026-11-13T15:30:00Z'))).toBe('2026-11-14T00:30:00+09:00')
  })
})

describe('formatJst', () => {
  test('shows month, day and time to the second', () => {
    expect(formatJst('2026-11-13T10:42:17+09:00')).toBe('11/13 10:42:17')
  })
})

describe('serializeRecords / parseRecords', () => {
  const records = { 3303: '2026-11-13T10:05:00+09:00', 13302: '2026-11-13T10:02:00+09:00' }

  test('writes records in room-list order with their task', () => {
    const file = JSON.parse(serializeRecords(records, ROOMS, '2026-11-13T10:05:01+09:00'))

    expect(file).toEqual({
      updatedAt: '2026-11-13T10:05:01+09:00',
      records: [
        { room: 13302, task: 'gr', doneAt: '2026-11-13T10:02:00+09:00' },
        { room: 3303, task: 'bypass', doneAt: '2026-11-13T10:05:00+09:00' },
      ],
    })
  })

  test('reads back what it wrote', () => {
    const text = serializeRecords(records, ROOMS, '2026-11-13T10:05:01+09:00')

    expect(parseRecords(text)).toEqual(records)
  })

  test('throws on malformed content instead of treating it as empty', () => {
    expect(() => parseRecords('not json')).toThrow()
    expect(() => parseRecords('{"records": "oops"}')).toThrow()
  })
})
