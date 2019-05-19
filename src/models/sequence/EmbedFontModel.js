import Constants from '@/config/constants';
import util from '@/utils/baseutil';

export default class EmbedFontModel {
  constructor() {
    this._isUse = false;
    this._name = 'Nanum Barun Gothic';
    this._size = 36;
    this._color = '#000000';
    this._alpha = 1;
    this._align = Constants.CENTER;
    this._bold = false;
    this._line_height = false;
  }

  init = (json) => {
    if (json) {
      this._name = json.name || 'Nanum Barun Gothic';
      this._size = json.size || 36;
      this._color = json.color || '#000000';
      this._alpha = parseFloat(json.alpha || 1);
      this._align = json.align || Constants.CENTER;
      this._bold = util.isTrue(json.bold);
      if (!util.isFalse(json.line_height) && util.isNumber(json.line_height)) {
        this._line_height = parseFloat(json.line_height);
      }
      this._isUse = true;
    }

    return this;
  };

  getStyle = () => {
    let style = '';
    if (this._isUse) {
      const rgb = util.hexToRGB(this._color);
      if (this._alpha !== 1) {
        style += ` color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._alpha});`;
      } else {
        style += ` color: ${this._color};`;
      }
      // style += ' font-family: \'Noto Sans KR\';';
      style += ` font-size: ${this._size}px;`;
      style += ` font-weight: ${this._bold ? 700 : 400};`;
      style += ` text-align: ${this._align};`;
      if (util.isNumber(this._line_height)) {
        style += ` line-height: ${this._line_height}px;`;
      }
    }
    return style;
  };

  get isUse() {
    return this._isUse;
  }

  set isUse(value) {
    this._isUse = value;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  get size() {
    return this._size;
  }

  set size(value) {
    this._size = value;
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value;
  }

  get alpha() {
    return this._alpha;
  }

  set alpha(value) {
    this._alpha = value;
  }

  get align() {
    return this._align;
  }

  set align(value) {
    this._align = value;
  }

  get bold() {
    return this._bold;
  }

  set bold(value) {
    this._bold = value;
  }

  get line_height() {
    return this._line_height;
  }

  set line_height(value) {
    this._line_height = value;
  }

  getRGBA() {
    const rgb = util.hexToRGB(this._color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._alpha})`;
  }

  toJSON = () => {
    const json = {};
    json.name = this._name;
    json.size = this._size;
    json.color = this._color;
    json.alpha = this._alpha;
    json.align = this._align;
    json.bold = this._bold;
    json.line_height = this._line_height;

    return json;
  };

  getXmlJson = (scale) => {
    return {
      "$": {
        "Name": this._bold ? 'Nanum Barun Gothic Bold' : 'Nanum Barun Gothic',
        "Size": Math.round(this._size * scale),
        "Color": util.colorCodeToHex(this._color),
        "Alpha": this._alpha,
        "Align": this._align,
        "LineSpacing": Math.round((this._line_height - this._size) * scale)
      }
    }
  };
}
