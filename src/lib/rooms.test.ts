import { expect, test } from 'vitest'
import { ALL_ROOMS, FLOORS, ROOMS, suiteNumber } from './rooms'

test('lists 96 bypass rooms and 30 grounding rooms', () => {
  expect(ROOMS.filter((r) => r.task === 'bypass')).toHaveLength(96)
  expect(ROOMS.filter((r) => r.task === 'gr')).toHaveLength(30)
})

test('hides rooms that are on hold', () => {
  expect(ROOMS).toEqual(ALL_ROOMS.filter((r) => !r.onHold))
})

test('includes the grounding room on 34F that was confirmed after the first release', () => {
  expect(ROOMS.find((r) => r.room === 13402)).toMatchObject({ floor: '34F', task: 'gr' })
})

test('marks every room on 40F as needing confirmation before the work', () => {
  const flagged = ROOMS.filter((r) => r.confirmFirst).map((r) => r.room)

  expect(flagged).toEqual([14001, 24001, 4002])
  expect(ROOMS.filter((r) => r.floor === '40F').map((r) => r.room)).toEqual(flagged)
})

test('lists floors from the lowest to the highest', () => {
  expect(FLOORS).toEqual(['33F', '34F', '35F', '36F', '37F', '38F', '39F', '40F'])
})

test('maps a connected room to the suite it belongs to', () => {
  expect(suiteNumber(13308)).toBe(3308)
  expect(suiteNumber(24001)).toBe(4001)
  expect(suiteNumber(3301)).toBe(3301)
})
