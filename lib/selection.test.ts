import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  editableSelection,
  inputOrTextareaSelection,
  tryExecCommandInsertText,
} from './selection'
import { commands, userEvent } from '@vitest/browser/context'

describe('input or textarea selection', () => {
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
  it('no selection', async () => {
    const selection = inputOrTextareaSelection(input)
    expect(selection.getSelection()).eq('')
    expect(selection.hasSelection()).false
    expect(selection.getInputValue()).eq('hello world')

    selection.replaceInputValue('hi')
    expect(input.value).eq('hi')
    await commands.undo()
    expect(input.value).eq('hello world')
  })
  it('has selection', async () => {
    const selection = inputOrTextareaSelection(input)
    await userEvent.click(input)
    await commands.keypress('Home')
    await commands.keydown('Shift')
    Array.from({ length: 5 }).forEach(async () => {
      await commands.keydown('ArrowRight')
    })
    await commands.keyup('Shift')
    expect(selection.hasSelection()).true
    expect(selection.getSelection()).eq('hello')

    selection.replaceSelection('hi')
    expect(input.value).eq('hi world')
    expect(selection.hasSelection()).false
    await userEvent.type(input, ' javascript')
    expect(input.value).eq('hi javascript world')
    await commands.undo()
    // expect(input.value).eq('hi world')
    // await commands.undo()
    expect(input.value).eq('hello world') // TODO: why?
  })
  it('has selection and direction', async () => {
    const selection = inputOrTextareaSelection(input)
    await userEvent.click(input)
    await commands.keydown('Shift')
    Array.from({ length: 5 }).forEach(async () => {
      await commands.keydown('ArrowLeft')
    })
    await commands.keyup('Shift')
    expect(selection.hasSelection()).true
    expect(selection.getSelection()).eq('world')

    selection.replaceSelection('javascript')
    expect(input.value).eq('hello javascript')
    expect(selection.hasSelection()).false
    await commands.undo()
    expect(input.value).eq('hello world')
  })
})

describe('editable selection', () => {
  let input: HTMLElement
  beforeEach(async () => {
    input = document.createElement('div')
    input.contentEditable = 'true'
    input.dataset.testid = 'test-editable'
    document.body.append(input)
    await userEvent.fill(input, 'hello world')
  })
  afterEach(() => {
    input.remove()
  })
  it('no selection', async () => {
    const selection = editableSelection(input)
    expect(selection.hasSelection()).false
    expect(selection.getSelection()).eq('')
    expect(selection.getInputValue()).eq('hello world')

    await selection.replaceInputValue('hi')
    expect(input.innerText).eq('hi')
    expect(selection.hasSelection()).false
    await commands.undo()
    expect(input.innerText).eq('hello world')
  })
  it.skip('has selection', async () => {
    const selection = editableSelection(input)
    await userEvent.click(input)
    await commands.keypress('Home')
    await commands.keydown('Shift')
    Array.from({ length: 5 }).forEach(async () => {
      await commands.keydown('ArrowRight')
    })
    await commands.keyup('Shift')
    expect(selection.hasSelection()).true
    expect(selection.getSelection()).eq('hello')

    await selection.replaceSelection('hi')
    expect(input.innerText).eq('hi world')
    expect(selection.hasSelection()).false
    await userEvent.type(input, ' javascript')
    expect(input.innerText).eq('hi javascript world')
    await commands.undo()
    expect(input.innerText).eq('hi world')
    await commands.undo()
    expect(input.innerText).eq('hello world')
  })
  it('auto change on paste', async () => {
    const selection = editableSelection(input)
    await userEvent.click(input)
    await userEvent.fill(input, '')
    expect(input.innerText.trim()).eq('')
    input.addEventListener('paste', (ev) => {
      const str = ev.clipboardData?.getData('text/plain')
      if (!str) {
        return
      }
      ev.preventDefault()
      document.execCommand('insertText', false, str.repeat(2))
    })
    await userEvent.paste()
    await selection.replaceInputValue('hello')
    expect(input.innerText).eq('hellohello')

    await commands.keypress('Home')
    await commands.keydown('Shift')
    Array.from({ length: 5 }).forEach(async () => {
      await commands.keydown('ArrowRight')
    })
    await commands.keyup('Shift')
    await selection.replaceSelection('world')
    expect(input.innerText).eq('worldworldhello')
  })
  it('custom paste event listener', async () => {
    const selection = editableSelection(input)
    input.addEventListener('paste', (ev) => {
      if (!ev.isTrusted) {
        // example: https://gemini.google.com/app
        input.textContent = ''
      }
    })
    expect(selection.getInputValue()).eq('hello world')
    await selection.replaceInputValue('hi')
    expect(input.innerText).eq('hi')
  })
  // Regression test: contentEditable inside Shadow DOM should be writable.
  // On iOS Safari, the old selectAll implementation using removeAllRanges()+addRange()
  // caused blur, making execCommand fail. setBaseAndExtent() fixes this.
  it('contentEditable inside shadow DOM', async () => {
    input.remove()
    const host = document.createElement('div')
    document.body.append(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    inner.contentEditable = 'true'
    inner.dataset.testid = 'test-shadow-editable'
    shadow.append(inner)
    await userEvent.click(inner)
    await userEvent.fill(inner, 'hello world')

    const selection = editableSelection(inner)
    expect(selection.getInputValue()).eq('hello world')
    await selection.replaceInputValue('hi')
    expect(inner.innerText).eq('hi')

    host.remove()
  })
  // https://quilljs.com/
  it.todo('quill editor')

  // Discord uses Slate editor which inserts U+FEFF and extra newlines for empty lines
  it('Discord/Slate editor multiline with empty lines', () => {
    // Simulate Discord's Slate editor HTML structure for:
    // "first line"
    // (empty line)
    // "second line"
    input.innerHTML = `
      <div data-slate-node="element">
        <span data-slate-node="text">
          <span data-slate-leaf="true">
            <span data-slate-string="true">first line</span>
          </span>
        </span>
      </div>
      <div data-slate-node="element">
        <span data-slate-node="text">
          <span data-slate-leaf="true" class="emptyText__1464f">
            <span data-slate-zero-width="n" data-slate-length="0">\uFEFF<br></span>
          </span>
        </span>
      </div>
      <div data-slate-node="element">
        <span data-slate-node="text">
          <span data-slate-leaf="true">
            <span data-slate-string="true">second line</span>
          </span>
        </span>
      </div>
    `

    const selection = editableSelection(input)
    const value = selection.getInputValue()

    // Should normalize to exactly one empty line (two newlines)
    // Without the fix, innerText returns "first line\n﻿\n\nsecond line" (with U+FEFF and 3 newlines)
    expect(value).eq('first line\n\nsecond line')
    expect(value).not.include('\uFEFF')
  })
})

describe('tryExecCommandInsertText', () => {
  describe('input', () => {
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
    it('replace all text', async () => {
      await tryExecCommandInsertText('hi', input, 100)
      expect(input.value).eq('hi')
    })
    it('replace selected text', async () => {
      await commands.keypress('Home')
      await commands.keydown('Shift')
      for (let i = 0; i < 5; i++) {
        await commands.keydown('ArrowRight')
      }
      await commands.keyup('Shift')
      await tryExecCommandInsertText('hi', input, 100)
      expect(input.value).eq('hi world')
    })
  })
  describe('editable', () => {
    let input: HTMLElement
    beforeEach(async () => {
      input = document.createElement('div')
      input.contentEditable = 'true'
      input.dataset.testid = 'test-editable'
      document.body.append(input)
      await userEvent.fill(input, 'hello world')
    })
    afterEach(() => {
      input.remove()
    })
    it('replace all text', async () => {
      await tryExecCommandInsertText('hi', input, 100)
      expect(input.innerText).eq('hi')
    })
    it('replace selected text', async () => {
      await commands.keypress('Home')
      await commands.keydown('Shift')
      for (let i = 0; i < 5; i++) {
        await commands.keydown('ArrowRight')
      }
      await commands.keyup('Shift')
      await tryExecCommandInsertText('hi', input, 100)
      expect(input.innerText).eq('hi world')
    })
  })
})
