import { getActiveElement, isInputElement } from './selection'

export class UniversalSpaceDetector {
  private isMobile: boolean
  private spaceCount: number
  private lastSpaceTime: number
  private TIMEOUT: number
  private handler: ((e: KeyboardEvent | InputEvent) => void) | null = null
  private _enabled: boolean = false

  constructor(private readonly callback: () => void) {
    this.isMobile = this.detectMobile()
    this.spaceCount = 0
    this.lastSpaceTime = 0
    this.TIMEOUT = this.isMobile ? 800 : 500
  }

  get enabled() {
    return this._enabled
  }

  private detectMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    )
  }

  enable() {
    if (this._enabled) return
    this._enabled = true

    if (this.isMobile) {
      this.handler = (e) => {
        this.handleSpace(e as InputEvent, (e as InputEvent).data)
      }
      document.addEventListener('beforeinput', this.handler, true)
    } else {
      this.handler = (e) => {
        this.handleSpace(e as KeyboardEvent, (e as KeyboardEvent).key)
      }
      document.addEventListener('keydown', this.handler, true)
    }
  }

  disable() {
    if (!this._enabled || !this.handler) return
    this._enabled = false

    if (this.isMobile) {
      document.removeEventListener('beforeinput', this.handler, true)
    } else {
      document.removeEventListener('keydown', this.handler, true)
    }
    this.handler = null
    this.spaceCount = 0
  }

  private handleSpace(e: KeyboardEvent | InputEvent, key: string | null) {
    if (
      e.target !== null &&
      e.target instanceof HTMLElement &&
      !isInputElement(getActiveElement(e.target))
    ) {
      this.spaceCount = 0
      return
    }
    const spaceVariants = [
      '\u0020', // Space
      '\u3000', // Ideographic Space - CJK
      '\u00A0', // Non-breaking Space - French
    ]
    if (!key || !spaceVariants.includes(key)) {
      this.spaceCount = 0
      return
    }
    const now = Date.now()
    if (now - this.lastSpaceTime > this.TIMEOUT) {
      this.spaceCount = 1
    } else {
      this.spaceCount++
    }
    this.lastSpaceTime = now
    if (this.spaceCount < 3) {
      return
    }
    this.lastSpaceTime = 0
    this.spaceCount = 0
    this.callback()
  }
}
