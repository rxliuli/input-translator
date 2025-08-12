import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UniversalSpaceDetector } from './UniversalSpaceDetector'
import { commands, userEvent } from '@vitest/browser/context'

let input: HTMLInputElement
beforeEach(async () => {
  input = document.createElement('input')
  input.type = 'text'
  input.dataset.testid = 'test-input'
  input.value = ''
  document.body.append(input)
  await userEvent.fill(input, 'hello world')
})
afterEach(() => {
  input.remove()
})

describe('UniversalSpaceDetector desktop', () => {
  it('should detect 3 spaces', async () => {
    const callback = vi.fn()
    new UniversalSpaceDetector(callback)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(1)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

describe('UniversalSpaceDetector mobile', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    )
  })
  it('should detect 3 spaces', async () => {
    const callback = vi.fn()
    new UniversalSpaceDetector(callback)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(1)
    await userEvent.type(input, ' ')
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it('should detect 3 cjk spaces', async () => {
    const callback = vi.fn()
    const CJKSpace = '　'
    new UniversalSpaceDetector(callback)
    await userEvent.type(input, CJKSpace)
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, CJKSpace)
    expect(callback).toHaveBeenCalledTimes(0)
    await userEvent.type(input, CJKSpace)
    expect(callback).toHaveBeenCalledTimes(1)
    await userEvent.type(input, CJKSpace)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
