import log from './logger'

const { registerFont, createCanvas } = require('canvas')

const log_prefix = '[text-to-image]'

/**
 * Convert text to PNG image.
 * @param text
 * @param [options]
 * @param [options.font='30px sans-serif'] css style font
 * @param [options.color='black'] (or options.textColor) text color
 * @param [options.backgroundColor] (or options.bgColor) background color
 * @param [options.lineSpacing=0]
 * @param [options.padding=0] width of the padding area (left, top, right, bottom)
 * @param [options.paddingLeft]
 * @param [options.paddingTop]
 * @param [options.paddingRight]
 * @param [options.paddingBottom]
 * @param [options.borderWidth=0] width of border (left, top, right, bottom)
 * @param [options.borderLeftWidth=0]
 * @param [options.borderTopWidth=0]
 * @param [options.borderRightWidth=0]
 * @param [options.borderBottomWidth=0]
 * @param [options.borderColor='black'] border color
 * @param [options.textAlign='left'] text alignment (left, center, right)
 * @param [options.localFontPath] path to local font (e.g. fonts/Lobster-Regular.ttf)
 * @param [options.localFontName] name of local font (e.g. Lobster)
 * @param [options.output='buffer'] 'buffer', 'stream', 'dataURL', 'canvas's
 * @returns {Object} png image buffer
 */
const text2png = (text, options = {}) => {
  // Options
  options = parseOptions(options)

  // Register a custom font
  if (options.localFontPath && options.localFontName) {
    registerFont(options.localFontPath, { family: options.localFontName })
  }

  const canvas = createCanvas(0, 0)
  const ctx = canvas.getContext('2d')
  const text_canvas = makeText(text, options)
  const contentWidth = text_canvas.width
  const contentHeight = text_canvas.height

  canvas.width = contentWidth
  canvas.height = contentHeight

  const hasBorder =
    options.borderLeftWidth
    || options.borderTopWidth
    || options.borderRightWidth
    || options.borderBottomWidth

  if (hasBorder) {
    ctx.fillStyle = options.borderColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(
      options.borderLeftWidth,
      options.borderTopWidth,
      canvas.width - (options.borderLeftWidth + options.borderRightWidth),
      canvas.height - (options.borderTopWidth + options.borderBottomWidth)
    )
  } else if (hasBorder) {
    ctx.clearRect(
      options.borderLeftWidth,
      options.borderTopWidth,
      canvas.width - (options.borderLeftWidth + options.borderRightWidth),
      canvas.height - (options.borderTopWidth + options.borderBottomWidth)
    )
  }

  ctx.drawImage(text_canvas, 0, 0)

  const result = { width: contentWidth, height: contentHeight }

  try {
    switch (options.output) {
      case 'buffer':
        result.data = canvas.toBuffer()
        break
      case 'stream':
        result.data = canvas.createPNGStream()
        break
      case 'dataURL':
        result.data = canvas.toDataURL('image/png')
        break
      case 'canvas':
        result.data = canvas
        break
      default:
        throw new Error(`output type:${options.output} is not supported.`)
    }
  } catch (error) {
    log.error(log_prefix, '[text2png]', text, result, options, error)
    throw error
  }

  return result
}

const makeText = (origin_text, options) => {
  const canvas = createCanvas(0, 0)
  const ctx = canvas.getContext('2d')

  // Font and size is required for ctx.measureText()
  const padding_w = options.paddingLeft + options.paddingRight
  const padding_h = options.paddingTop + options.paddingBottom
  const line_spacing = options.lineSpacing
  const font_size = options.fontSize
  const max_width = options.maxWidth - padding_w
  let max_line_height = 0
  let lines = []
  let width = 0

  ctx.font = font_size + 'px ' + options.fontName

  // Start calculation
  const text_list = origin_text.split(/\r\n|\r|\n/)
  for (let k = 0; k < text_list.length; k++) {
    let text = text_list[k]
    while (text.length) {
      let i
      let result
      if (options.multiLine) {
        for (i = text.length; ctx.measureText(text.substr(0, i)).width > max_width; i--)
        result = text.substr(0, i)
        text = text.substr(result.length, text.length)
      } else {
        result = text
        text = ''
      }

      const line_text = result
      const measure_text = ctx.measureText(line_text)
      let line_width = measure_text.width
      if (measure_text.height > max_line_height) {
        max_line_height = measure_text.height
      }
      if (options.multiLine) {
        width = Math.max(width, line_width)
      } else {
        line_width = Math.min(max_width, line_width)
        width = Math.max(width, line_width)
      }
      lines.push({ text: line_text, width: line_width })
    }
  }

  // Calculate canvas size, add margin
  const line_max_width = padding_w + width
  const start_y = (-font_size / 2) + (line_spacing / 2)
  const text_height = padding_h + (font_size + line_spacing) * lines.length
  ctx.canvas.width = line_max_width
  ctx.canvas.height = Math.min(text_height, options.maxHeight)
  ctx.font = font_size + 'px ' + options.fontName
  ctx.textBaseline = 'middle'
  ctx.fillStyle = options.textColor

  ctx.antialias = 'gray'
  for (let i = 0, j = lines.length; i < j; ++i) {
    const line = lines[i]
    let x = options.paddingLeft
    if (options.textAlign === 'center') {
      x = Math.max(options.paddingLeft, (line_max_width - line.width) / 2)
    } else if (options.textAlign === 'right') {
      x = Math.max(options.paddingLeft, line_max_width - line.width - options.paddingRight)
    }
    const y = start_y + options.paddingTop + font_size + (font_size + line_spacing) * i
    if (options.maxHeight < y) {
      break
    }
    ctx.fillText(line.text, x, y)
  }

  return canvas
}

const parseOptions = (options) => {
  const new_options = {
    backgroundColor: options.bgColor || options.backgroundColor || null,
    borderColor: options.borderColor || 'black',
    borderWidth: options.borderWidth || 0,
    borderLeftWidth: typeof options.borderLeftWidth === 'number' ? options.borderLeftWidth : options.borderWidth || 0,
    borderTopWidth: typeof options.borderTopWidth === 'number' ? options.borderTopWidth : options.borderWidth || 0,
    borderBottomWidth: typeof options.borderBottomWidth === 'number' ? options.borderBottomWidth : options.borderWidth || 0,
    borderRightWidth: typeof options.borderRightWidth === 'number' ? options.borderRightWidth : options.borderWidth || 0,
    fontSize: options.fontSize || 30,
    fontName: options.fontName || 'NanumBarunGothic',
    lineSpacing: options.lineSpacing || 0,
    paddingLeft: typeof options.paddingLeft === 'number' ? options.paddingLeft : options.padding || 0,
    paddingTop: typeof options.paddingTop === 'number' ? options.paddingTop : options.padding || 0,
    paddingRight: typeof options.paddingRight === 'number' ? options.paddingRight : options.padding || 0,
    paddingBottom: typeof options.paddingBottom === 'number' ? options.paddingBottom : options.padding || 0,
    textAlign: options.textAlign || 'left',
    textColor: options.textColor || options.color || 'black',
    output: options.output || 'buffer',
    localFontName: options.localFontName || null,
    localFontPath: options.localFontPath || null,
    multiLine: options.multiLine || false,
    stageWidth: options.stageWidth || 1920,
    stageHeight: options.stageHeight || 1080,
    startX: options.startX || 0,
    startY: options.startY || 0,
  }

  new_options.remainWidth = new_options.stageWidth - new_options.startX
  new_options.remainHeight = new_options.stageHeight - new_options.startY

  if (options.maxWidth) {
    new_options.maxWidth = Math.min(options.maxWidth, new_options.remainWidth)
  } else {
    new_options.maxWidth = new_options.remainWidth
  }
  if (options.maxHeight) {
    new_options.maxHeight = Math.min(options.maxHeight, new_options.remainHeight)
  } else {
    new_options.maxHeight = new_options.remainHeight
  }

  return new_options
}

export default text2png
