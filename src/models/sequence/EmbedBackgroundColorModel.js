import Util from '../../utils/baseutil'

export default class EmbedBackgroundColorModel {
  constructor () {
    this._isUse = false
    this._color = '#000000'
    this._alpha = 0
  }

  init = (json) => {
    if (json) {
      this._color = json.color || '#000000'
      this._alpha = parseFloat(json.alpha || 0)
      this._isUse = true
    }

    return this
  }

  getStyle = () => {
    let style = ''
    if (this._isUse) {
      const rgb = Util.hexToRGB(this._color)
      if (this._alpha !== 1) {
        style += ` background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._alpha});`
      } else {
        style += ` background-color: ${this._color};`
      }
    }
    return style
  }

  get isUse () {
    return this._isUse
  }

  set isUse (value) {
    this._isUse = value
  }

  get color () {
    return this._color
  }

  set color (value) {
    this._color = value
  }

  get alpha () {
    return this._alpha
  }

  set alpha (value) {
    this._alpha = value
  }

  getRGBA () {
    const rgb = Util.hexToRGB(this._color)
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._alpha})`
  }

  toJSON = () => {
    const json = {}
    json.color = this._color
    json.alpha = this._alpha

    return json
  }

  getXmlJson = () => {
    return {
      '$': {
        'Color': Util.colorCodeToHex(this._color),
        'Alpha': this._alpha
      }
    }
  }
}
