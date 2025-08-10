export class UniversalSpaceDetector {
  private isMobile: boolean
  private spaceCount: number
  private lastSpaceTime: number
  private TIMEOUT: number

  constructor(private readonly callback: (event: Event) => void) {
    this.isMobile = this.detectMobile()
    this.spaceCount = 0
    this.lastSpaceTime = 0
    this.TIMEOUT = this.isMobile ? 800 : 500

    this.init()
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

  private init() {
    if (this.isMobile) {
      this.initMobileListeners()
    } else {
      this.initDesktopListeners()
    }
  }

  private initDesktopListeners() {
    document.addEventListener(
      'keydown',
      (e) => {
        console.log('keydown', e.key)
        if (e.key === ' ') {
          this.handleSpace(e)
        }
      },
      true,
    )
  }

  private initMobileListeners() {
    document.addEventListener(
      'beforeinput',
      (e) => {
        if (e.data === ' ') {
          this.handleSpace(e)
        }
      },
      true,
    )
  }

  private handleSpace(e: InputEvent | KeyboardEvent) {
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
    this.callback(e)
  }
}
