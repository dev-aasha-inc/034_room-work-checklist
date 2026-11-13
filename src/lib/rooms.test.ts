import { expect, test } from 'vitest'
import { FLOORS, ROOMS, suiteNumber } from './rooms'

test('lists 96 bypass rooms and 27 grounding rooms', () => {
  expect(ROOMS.filter((r) => r.task === 'bypass')).toHaveLength(96)
  expect(ROOMS.filter((r) => r.task === 'gr')).toHaveLength(27)
})

test('hides rooms that are on hold', () => {
  const numbers = ROOMS.map((r) => r.room)

  expect(numbers).not.toContain(13402)
  expect(numbers).not.toContain(14001)
  expect(numbers).not.toContain(24001)
})

test('lists floors from the lowest to the highest', () => {
  expect(FLOORS).toEqual(['33F', '34F', '35F', '36F', '37F', '38F', '39F', '40F'])
})

test('maps a connected room to the suite it belongs to', () => {
  expect(suiteNumber(13308)).toBe(3308)
  expect(suiteNumber(24001)).toBe(4001)
  expect(suiteNumber(3301)).toBe(3301)
})
