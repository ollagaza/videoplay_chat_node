import Constants from '../../constants/constants'
import Util from '../../utils/baseutil'

export default class EmbedPositionModel {
  constructor () {
    this._isUse = false
    this._horizon = Constants.NONE
    this._vertical = Constants.NONE
    this._left = false
    this._right = false
    this._top = false
    this._bottom = false
  }

  init = (json) => {
    if (json) {
      this._horizon = json.horizon
      this._vertical = json.vertical
      if (!Util.isFalse(json.left) && Util.isNumber(json.left)) {
        this._left = parseFloat(json.left)
      }
      if (!Util.isFalse(json.right) && Util.isNumber(json.right)) {
        this._right = parseFloat(json.right)
      }
      if (!Util.isFalse(json.top) && Util.isNumber(json.top)) {
        this._top = parseFloat(json.top)
      }
      if (!Util.isFalse(json.bottom) && Util.isNumber(json.bottom)) {
        this._bottom = parseFloat(json.bottom)
      }
      this._isUse = true
    }

    return this
  }

  getStyle = () => {
    let style = ''
    let transform = ''
    if (this._isUse) {
      style += ' position: absolute;'
      if (this._horizon === Constants.CENTER) {
        style += ' left: 50%;'
        transform += 'translateX(-50%)'
      } else if (this._horizon === Constants.LEFT) {
        style += ' left: 0;'
      } else if (this._left !== false) {
        style += ` left: ${this._left}px;`
      }
      if (this._horizon === Constants.RIGHT) {
        style += ' right: 0;'
      } else if (this._right !== false && this._horizon !== Constants.CENTER) {
        style += ` right: ${this._right}px;`
      }
      if (this._vertical === Constants.CENTER) {
        style += ' top: 50%;'
        transform += `${transform === '' ? '' : ', '}translateY(-50%)`
      } else if (this._vertical === Constants.TOP) {
        style += ' top: 0;'
      } else if (this._top !== false && this._vertical !== Constants.CENTER) {
        style += ` top: ${this._top}px;`
      }
      if (this._horizon === Constants.BOTTOM) {
        style += ' bottom: 0;'
      } else if (this._bottom !== false && this._vertical !== Constants.CENTER) {
        style += ` bottom: ${this._bottom}px;`
      }
      if (transform !== '') {
        style += ` transform: ${transform};`
      }
    }
    return style
  }

  getStartX = () => {
    if (this._horizon === Constants.CENTER) {
      return 0
    } else if (this._horizon === Constants.LEFT) {
      return 0
    } else if (this._left !== false) {
      return this._left
    }
    if (this._horizon === Constants.RIGHT) {
      return 0
    } else if (this._right !== false && this._horizon !== Constants.CENTER) {
      return this._right
    }
  }

  getStartY = () => {
    if (this._vertical === Constants.CENTER) {
      return 0
    } else if (this._vertical === Constants.TOP) {
      return 0
    } else if (this._top !== false && this._vertical !== Constants.CENTER) {
      return this._top
    }
    if (this._horizon === Constants.BOTTOM) {
      return 0
    } else if (this._bottom !== false && this._vertical !== Constants.CENTER) {
      return this._bottom
    }
  }

  get isUse () {
    return this._isUse
  }

  set isUse (value) {
    this._isUse = value
  }

  get horizon () {
    return this._horizon
  }

  set horizon (value) {
    this._horizon = value
  }

  get vertical () {
    return this._vertical
  }

  set vertical (value) {
    this._vertical = value
  }

  get left () {
    return this._left
  }

  set left (value) {
    this._left = value
  }

  get right () {
    return this._right
  }

  set right (value) {
    this._right = value
  }

  get top () {
    return this._top
  }

  set top (value) {
    this._top = value
  }

  get bottom () {
    return this._bottom
  }

  set bottom (value) {
    this._bottom = value
  }

  toJSON = () => {
    const json = {}
    json.horizon = this._horizon
    json.vertical = this._vertical
    json.left = this._left
    json.right = this._right
    json.top = this._top
    json.bottom = this._bottom

    return json
  }

  getXmlJson = (scale) => {
    const json = {}

    if (this._horizon === Constants.CENTER) {
      json.Horizon = Constants.CENTER
    } else if (this._horizon === Constants.LEFT) {
      json.Horizon = Constants.LEFT
    } else if (this._left !== false) {
      json.Left = Math.round(this._left * scale)
    }
    if (this._horizon === Constants.RIGHT) {
      json.Horizon = Constants.RIGHT
    } else if (this._right !== false && this._horizon !== Constants.CENTER) {
      json.Right = Math.round(this._right * scale)
    }
    if (this._vertical === Constants.CENTER) {
      json.Vertical = Constants.CENTER
    } else if (this._vertical === Constants.TOP) {
      json.Vertical = Constants.TOP
    } else if (this._top !== false && this._vertical !== Constants.CENTER) {
      json.Top = Math.round(this._top * scale)
    }
    if (this._horizon === Constants.BOTTOM) {
      json.Vertical = Constants.BOTTOM
    } else if (this._bottom !== false && this._vertical !== Constants.CENTER) {
      json.Bottom = Math.round(this._bottom * scale)
    }

    return {
      '$': json
    }
  }
}
