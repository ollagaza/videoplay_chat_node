import Constants from '../../constants/constants'
import Util from '../../utils/baseutil'

export default class EmbedSizeModel {
  constructor () {
    this._isUse = false
    this._width = Constants.AUTO
    this._height = Constants.AUTO
    this._maxWidth = false
    this._maxHeight = false
  }

  init = (json) => {
    if (json) {
      this._width = json.width
      this._height = json.height
      if (Util.isNumber(this._width)) {
        this._width = parseFloat(this._width)
      }
      if (Util.isNumber(this._height)) {
        this._height = parseFloat(this._height)
      }
      if (!Util.isFalse(json.maxWidth) && Util.isNumber(json.maxWidth)) {
        this._maxWidth = parseFloat(json.maxWidth)
      }
      if (!Util.isFalse(json.maxHeight) && Util.isNumber(json.maxHeight)) {
        this._maxHeight = parseFloat(json.maxHeight)
      }
      this._isUse = true
    }

    return this
  }

  getStyle = () => {
    let style = ''
    if (this._isUse) {
      if (this._width === Constants.MAX) {
        style += ' width: 100%;'
      } else if (this._width === Constants.AUTO) {
        if (this._maxWidth) {
          style += ` max-width: ${this._maxWidth}px;`
        }
      } else if (Util.isNumber(this._width)) {
        style += ` width: ${this._width}px;`
      }
      if (this._height === Constants.MAX) {
        style += ' height: 100%;'
      } else if (this._height === Constants.AUTO) {
        if (this._maxHeight) {
          style += ` max-width: ${this._maxHeight}px;`
        }
      } else if (Util.isNumber(this._height)) {
        style += ` height: ${this._height}px;`
      }
    }
    return style
  }

  getMaxWidth = (width_limit = 1920) => {
    if (this._width === Constants.MAX) {
      return width_limit
    } else if (this._width === Constants.AUTO) {
      if (this._maxWidth) {
        return Math.min(this._maxWidth, width_limit)
      } else {
        return width_limit
      }
    } else if (Util.isNumber(this._width)) {
      return this._width
    }
    return width_limit
  }

  getMaxHeight = (height_limit = 1920) => {
    if (this._height === Constants.MAX) {
      return height_limit
    } else if (this._height === Constants.AUTO) {
      if (this._maxHeight) {
        return Math.min(this._maxHeight, height_limit)
      } else {
        return height_limit
      }
    } else if (Util.isNumber(this._height)) {
      return this._height
    }
    return height_limit
  }

  get isUse () {
    return this._isUse
  }

  set isUse (value) {
    this._isUse = value
  }

  get width () {
    return this._width
  }

  set width (value) {
    this._width = value
  }

  get height () {
    return this._height
  }

  set height (value) {
    this._height = value
  }

  get maxWidth () {
    return this._maxWidth
  }

  set maxWidth (value) {
    this._maxWidth = value
  }

  get maxHeight () {
    return this._maxHeight
  }

  set maxHeight (value) {
    this._maxHeight = value
  }

  toJSON = () => {
    const json = {}
    json.width = this._width
    json.height = this._height
    json.maxWidth = this._maxWidth
    json.maxHeight = this._maxHeight

    return json
  }

  getXmlJson = (scale) => {
    const json = {}

    if (this._width === Constants.MAX) {
      json.Width = Constants.MAX
    } else if (this._width === Constants.AUTO) {
      json.Width = Constants.AUTO
      if (this._maxWidth) {
        json.MaxWidth = Math.round(this._maxWidth * scale)
      }
    } else if (Util.isNumber(this._width)) {
      json.Width = Math.round(this._width * scale)
    }
    if (this._height === Constants.MAX) {
      json.Height = Constants.MAX
    } else if (this._height === Constants.AUTO) {
      json.Height = Constants.AUTO
      if (this._maxHeight) {
        json.MaxHeight = Math.round(this._maxHeight * scale)
      }
    } else if (Util.isNumber(this._height)) {
      json.Height = Math.round(this._height * scale)
    }

    return {
      '$': json
    }
  }
}
