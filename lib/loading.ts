// @ts-nocheck
export class InputLoader {
  constructor() {
    this.loaderElement = null
    this.styleElement = null
    this.initStyles()
  }

  initStyles() {
    if (document.getElementById('input-loader-styles')) return

    this.styleElement = document.createElement('style')
    this.styleElement.id = 'input-loader-styles'
    this.styleElement.textContent = `
      .input-loader-container {
        position: absolute;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        z-index: 10000;
        pointer-events: none;
      }
      
      .input-loader-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #e91e63;
        animation: input-loader-pulse 1.4s ease-in-out infinite;
      }
      
      .input-loader-dot:nth-child(1) {
        animation-delay: 0s;
      }
      
      .input-loader-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .input-loader-dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes input-loader-pulse {
        0%, 60%, 100% {
          opacity: 0.3;
          transform: scale(0.8);
        }
        30% {
          opacity: 1;
          transform: scale(1.2);
        }
      }
    `
    document.head.appendChild(this.styleElement)
  }

  // 判断是否是可编辑元素
  isEditableElement(element) {
    if (!element) return false

    // 检查是否是 input 或 textarea
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return true
    }

    // 检查是否是 contenteditable
    if (element.contentEditable === 'true') {
      return true
    }

    // 检查是否在 contenteditable 元素内
    let parent = element.parentElement
    while (parent) {
      if (parent.contentEditable === 'true') {
        return true
      }
      parent = parent.parentElement
    }

    return false
  }

  // 获取光标位置（支持 contenteditable）
  getCaretCoordinates(element) {
    const isContentEditable = element.contentEditable === 'true'

    if (isContentEditable) {
      return this.getContentEditableCaretCoordinates(element)
    } else {
      return this.getInputCaretCoordinates(element)
    }
  }

  // 获取 contenteditable 元素的光标位置（不影响选区）
  getContentEditableCaretCoordinates(element) {
    const selection = window.getSelection()

    if (selection.rangeCount === 0) {
      return { left: 0, top: 0, lineHeight: 20 }
    }

    const range = selection.getRangeAt(0)

    // 方法1：使用 Range.getBoundingClientRect()
    // 这个方法不会修改 DOM，但对于折叠的光标可能返回空矩形
    let rect = range.getBoundingClientRect()

    // 如果 getBoundingClientRect 返回空矩形（光标位置），尝试其他方法
    if (rect.width === 0 && rect.height === 0) {
      // 方法2：创建一个克隆的 range，稍微扩展一点范围来获取位置
      const clonedRange = range.cloneRange()

      // 保存原始位置
      const startContainer = range.startContainer
      const startOffset = range.startOffset

      try {
        // 尝试在光标位置前插入一个零宽字符来获取位置
        const textNode = document.createTextNode('\u200B')

        if (startContainer.nodeType === Node.TEXT_NODE) {
          // 如果是文本节点，分割节点并插入
          const afterNode = startContainer.splitText(startOffset)
          startContainer.parentNode.insertBefore(textNode, afterNode)
        } else {
          // 如果是元素节点，直接插入
          if (startOffset < startContainer.childNodes.length) {
            startContainer.insertBefore(
              textNode,
              startContainer.childNodes[startOffset],
            )
          } else {
            startContainer.appendChild(textNode)
          }
        }

        // 选择零宽字符获取位置
        clonedRange.selectNode(textNode)
        rect = clonedRange.getBoundingClientRect()

        // 立即移除零宽字符
        textNode.remove()

        // 恢复文本节点（如果之前分割了）
        if (
          startContainer.nodeType === Node.TEXT_NODE &&
          startContainer.nextSibling?.nodeType === Node.TEXT_NODE
        ) {
          startContainer.appendData(startContainer.nextSibling.textContent)
          startContainer.nextSibling.remove()
        }
      } catch (e) {
        // 如果出错，使用元素的位置作为后备
        rect = element.getBoundingClientRect()
      }
    }

    const elementRect = element.getBoundingClientRect()

    // 获取行高
    const styles = window.getComputedStyle(element)
    const fontSize = parseFloat(styles.fontSize) || 16
    let lineHeight = parseFloat(styles.lineHeight)
    if (isNaN(lineHeight)) {
      lineHeight = fontSize * 1.2
    }

    // 计算相对位置
    const coordinates = {
      left: rect.left - elementRect.left,
      top: rect.top - elementRect.top,
      lineHeight: lineHeight,
    }

    return coordinates
  }

  // 使用更安全的方法获取 contenteditable 光标位置
  getContentEditableCaretCoordinatesSafe(element) {
    const selection = window.getSelection()

    if (selection.rangeCount === 0) {
      return { left: 0, top: 0, lineHeight: 20 }
    }

    // 获取当前选区但不修改它
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // 如果能直接获取到位置
    if (rect.left || rect.top) {
      const elementRect = element.getBoundingClientRect()
      const styles = window.getComputedStyle(element)
      const fontSize = parseFloat(styles.fontSize) || 16
      let lineHeight = parseFloat(styles.lineHeight)
      if (isNaN(lineHeight)) {
        lineHeight = fontSize * 1.2
      }

      return {
        left: rect.left - elementRect.left,
        top: rect.top - elementRect.top,
        lineHeight: lineHeight,
      }
    }

    // 如果获取不到（光标在空位置），使用最后一个字符的位置
    try {
      const elementRect = element.getBoundingClientRect()
      const styles = window.getComputedStyle(element)
      const fontSize = parseFloat(styles.fontSize) || 16
      let lineHeight = parseFloat(styles.lineHeight)
      if (isNaN(lineHeight)) {
        lineHeight = fontSize * 1.2
      }

      // 获取最后输入的位置（简化处理）
      const textContent = element.textContent
      if (textContent.length > 0) {
        // 创建一个临时 range 选择最后一个字符
        const tempRange = document.createRange()
        const textNodes = this.getTextNodes(element)

        if (textNodes.length > 0) {
          const lastTextNode = textNodes[textNodes.length - 1]
          const lastCharIndex = Math.max(0, lastTextNode.textContent.length - 1)

          tempRange.setStart(lastTextNode, lastCharIndex)
          tempRange.setEnd(lastTextNode, lastTextNode.textContent.length)

          const lastCharRect = tempRange.getBoundingClientRect()

          return {
            left: lastCharRect.right - elementRect.left,
            top: lastCharRect.top - elementRect.top,
            lineHeight: lineHeight,
          }
        }
      }

      // 默认返回元素开始位置
      return {
        left: 0,
        top: 0,
        lineHeight: lineHeight,
      }
    } catch (e) {
      console.warn('Error getting caret position:', e)
      return { left: 0, top: 0, lineHeight: 20 }
    }
  }

  // 获取元素中的所有文本节点
  getTextNodes(element) {
    const textNodes = []
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    )

    let node
    while ((node = walker.nextNode())) {
      textNodes.push(node)
    }

    return textNodes
  }

  // 获取 input/textarea 元素的光标位置
  getInputCaretCoordinates(element) {
    const div = document.createElement('div')
    const styles = window.getComputedStyle(element)

    // 复制元素的样式
    ;[
      'fontFamily',
      'fontSize',
      'fontWeight',
      'letterSpacing',
      'wordSpacing',
      'textIndent',
      'textTransform',
      'lineHeight',
      'padding',
      'border',
      'boxSizing',
    ].forEach((prop) => {
      div.style[prop] = styles[prop]
    })

    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    div.style.overflow = 'hidden'
    div.style.width = element.offsetWidth + 'px'

    // 获取光标位置前的文本
    const selectionStart = element.selectionStart || element.value.length
    const textBeforeCaret = element.value.substring(0, selectionStart)

    div.textContent = textBeforeCaret

    // 添加一个 span 作为光标位置标记
    const span = document.createElement('span')
    span.textContent = '|'
    div.appendChild(span)

    document.body.appendChild(div)

    const fontSize = parseFloat(styles.fontSize) || 16
    let lineHeight = parseFloat(styles.lineHeight)
    if (isNaN(lineHeight)) {
      lineHeight = fontSize * 1.2
    }

    const coordinates = {
      left: span.offsetLeft,
      top: span.offsetTop,
      lineHeight: lineHeight,
    }

    document.body.removeChild(div)

    return coordinates
  }

  show(element, options = {}) {
    // 移除已存在的 loader
    this.hide()

    // 检查是否是可编辑元素
    if (!this.isEditableElement(element)) {
      console.warn('Element is not editable:', element)
      return
    }

    // 创建 loader 容器
    this.loaderElement = document.createElement('div')
    this.loaderElement.className = 'input-loader-container'

    // 创建三个点
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div')
      dot.className = 'input-loader-dot'
      this.loaderElement.appendChild(dot)
    }

    // 添加到 body
    document.body.appendChild(this.loaderElement)

    // 计算位置
    this.updatePosition(element, options)

    // 根据元素类型添加不同的事件监听
    const isContentEditable = element.contentEditable === 'true'

    this.inputListener = () => this.updatePosition(element, options)

    if (isContentEditable) {
      // contenteditable 元素的事件
      element.addEventListener('input', this.inputListener)
      element.addEventListener('keyup', this.inputListener)
      element.addEventListener('mouseup', this.inputListener)

      // 监听选区变化
      this.selectionListener = () => {
        if (element.contains(window.getSelection().anchorNode)) {
          this.updatePosition(element, options)
        }
      }
      document.addEventListener('selectionchange', this.selectionListener)
    } else {
      // input/textarea 元素的事件
      element.addEventListener('input', this.inputListener)
      element.addEventListener('keyup', this.inputListener)
      element.addEventListener('click', this.inputListener)
    }

    // 监听窗口滚动和调整大小
    this.scrollListener = () => this.updatePosition(element, options)
    window.addEventListener('scroll', this.scrollListener, true)
    window.addEventListener('resize', this.scrollListener)

    // 保存元素引用
    this.currentElement = element
    this.isCurrentContentEditable = isContentEditable
  }

  updatePosition(element, options = {}) {
    if (!this.loaderElement) return

    const rect = element.getBoundingClientRect()

    // 使用安全的方法获取光标位置
    const isContentEditable = element.contentEditable === 'true'
    let caretPos

    if (isContentEditable && options.useSafeMode !== false) {
      // 默认使用安全模式
      caretPos = this.getContentEditableCaretCoordinatesSafe(element)
    } else {
      caretPos = this.getCaretCoordinates(element)
    }

    // 获取样式
    const styles = window.getComputedStyle(element)
    const paddingLeft = parseFloat(styles.paddingLeft) || 0
    const paddingTop = parseFloat(styles.paddingTop) || 0

    // 计算滚动偏移
    let scrollLeft = 0
    let scrollTop = 0

    if (element.scrollLeft !== undefined) {
      scrollLeft = element.scrollLeft
      scrollTop = element.scrollTop || 0
    }

    // 计算 loader 的高度（用于垂直居中）
    const loaderHeight = 6

    // 计算垂直居中的偏移量
    const verticalCenterOffset = (caretPos.lineHeight - loaderHeight) / 2

    // 计算最终位置
    const left =
      rect.left +
      window.scrollX +
      paddingLeft +
      caretPos.left -
      scrollLeft +
      (options.offsetX || 10)
    const top =
      rect.top +
      window.scrollY +
      paddingTop +
      caretPos.top -
      scrollTop +
      verticalCenterOffset +
      (options.offsetY || 0)

    // 设置位置
    this.loaderElement.style.left = `${left}px`
    this.loaderElement.style.top = `${top}px`
  }

  hide() {
    if (this.loaderElement) {
      this.loaderElement.remove()
      this.loaderElement = null
    }

    if (this.currentElement && this.inputListener) {
      if (this.isCurrentContentEditable) {
        this.currentElement.removeEventListener('input', this.inputListener)
        this.currentElement.removeEventListener('keyup', this.inputListener)
        this.currentElement.removeEventListener('mouseup', this.inputListener)

        if (this.selectionListener) {
          document.removeEventListener(
            'selectionchange',
            this.selectionListener,
          )
          this.selectionListener = null
        }
      } else {
        this.currentElement.removeEventListener('input', this.inputListener)
        this.currentElement.removeEventListener('keyup', this.inputListener)
        this.currentElement.removeEventListener('click', this.inputListener)
      }

      this.currentElement = null
      this.inputListener = null
      this.isCurrentContentEditable = false
    }

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, true)
      window.removeEventListener('resize', this.scrollListener)
      this.scrollListener = null
    }
  }

  destroy() {
    this.hide()
    if (this.styleElement) {
      this.styleElement.remove()
      this.styleElement = null
    }
  }
}
