import Constants from '../../constants/constants'
import Util from '../../utils/baseutil'
import text2png from "../../libs/text-to-image"
import log from '../../libs/logger'
import EmbedBackgroundColorModel from './EmbedBackgroundColorModel';
import EmbedFontModel from './EmbedFontModel';
import EmbedPositionModel from './EmbedPositionModel';
import EmbedSizeModel from './EmbedSizeModel';

export default class EmbedModel {
  constructor(type) {
    this._id = Util.getRandomId();
    this._name = '';
    this._isUse = false;
    this._type = type;
    this._src = '';
    this._videoStartTime = 0;
    this._videoEndTime = 0;
    this._multiLine = false;
    this._padding = 0;
    this._resize = Constants.NONE;
    this._thumbnail = null;
    this._placeholder = '';

    this._backGroundColor = new EmbedBackgroundColorModel();
    this._font = new EmbedFontModel();
    this._size = new EmbedSizeModel();
    this._position = new EmbedPositionModel();

    this._stream_info = null;
    this._operation_seq = 0;
    this._video_name = null;
    this.log_prefix = '[SequenceModel]'
  }

  get id() {
    return this._id;
  }

  init = (json) => {
    if (json) {
      this._id = json.id;
      this._name = json.name;
      this._type = json.type;
      this._src = json.src || '';
      this._videoStartTime = parseFloat(json.videoStartTime || 0);
      this._videoEndTime = parseFloat(json.videoEndTime || 0);
      this._multiLine = Util.isTrue(json.multiLine || false);
      this._padding = parseFloat(json.padding || 0);
      this._resize = json.resize || Constants.NONE;
      this._thumbnail = json.thumbnail || null;
      this._placeholder = json.placeholder || '';

      this._backGroundColor.init(json.backGroundColor);
      this._font.init(json.font);
      this._size.init(json.size);
      this._position.init(json.position);

      this._stream_info = json.stream_info;
      this._operation_seq = json.operation_seq || 0;
      this._video_name = json.video_name;

      this._isUse = true;
    }

    return this;
  };

  getStyle = () => {
    let style = '';
    if (this._isUse) {
      if (this._type === Constants.TEXT) {
        style = this.getTextStyle();
      } else if (this._type === Constants.IMAGE) {
        style = this.getImageStyle();
      } else if (this._type === Constants.VIDEO) {
        style = this.getVideoStyle();
      }

      style += this._backGroundColor.getStyle();
      style += this._size.getStyle();
      style += this._position.getStyle();
      style += ' overflow: hidden;';
    }
    return style;
  };

  getTextStyle = () => {
    let style = '';
    if (this._multiLine === false) {
      style += ' white-space: nowrap;';
    }
    if (this._padding > 0) {
      style += ` padding: ${this._padding}px;`;
    }
    if (this._font.isUse) {
      style += this._font.getStyle();
    }

    return style;
  };

  getImageStyle = () => {
    let style = '';
    if (this._padding > 0) {
      style += ` padding: ${this._padding}px;`;
    }
    if (this._resize !== Constants.NONE) {
      style += ` object-fit: ${this._resize};`;
    }

    return style;
  };

  getVideoStyle = () => {
    let style = '';
    if (this._resize !== Constants.NONE) {
      style += ` object-fit: ${this._resize};`;
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

  get type() {
    return this._type;
  }

  get src() {
    return this._src;
  }
  set src(value) {
    this._src = Util.trim(value);
  }

  get videoStartTime() {
    return this._videoStartTime;
  }
  set videoStartTime(value) {
    this._videoStartTime = value;
  }

  get videoEndTime() {
    return this._videoEndTime;
  }
  set videoEndTime(value) {
    this._videoEndTime = value;
  }

  get multiLine() {
    return this._multiLine;
  }
  set multiLine(value) {
    this._multiLine = value;
  }

  get padding() {
    return this._padding;
  }
  set padding(value) {
    this._padding = value;
  }

  get resize() {
    return this._resize;
  }
  set resize(value) {
    this._resize = value;
  }

  get backGroundColor() {
    return this._backGroundColor;
  }
  get font() {
    return this._font;
  }
  get size() {
    return this._size;
  }
  get position() {
    return this._position;
  }

  get thumbnail() {
    return this._thumbnail;
  }
  set thumbnail(value) {
    this._thumbnail = value;
  }

  get stream_info() {
    return this._stream_info;
  }

  set stream_info(value) {
    this._stream_info = value;
  }

  get operation_seq() {
    return this._operation_seq;
  }

  set operation_seq(value) {
    this._operation_seq = value;
  }

  get placeholder() {
    return this._placeholder;
  }

  set placeholder(value) {
    this._placeholder = value;
  }

  get video_name() {
    return this._video_name;
  }

  set video_name(value) {
    this._video_name = value;
  }

  toJSON = () => {
    const json = {};
    json.type = this._type;
    json.name = this._name;
    json.src = this._src;
    json.videoStartTime = this._videoStartTime;
    json.videoEndTime = this._videoEndTime;
    json.multiLine = this._multiLine;
    json.padding = this._padding;
    json.resize = this._resize;
    json.thumbnail = this._thumbnail;
    json.stream_info = this._stream_info;
    json.operation_seq = this._operation_seq;

    if (this._backGroundColor.isUse) json.backGroundColor = this._backGroundColor.toJSON();
    if (this._font.isUse) json.font = this._font.toJSON();
    if (this._size.isUse) json.size = this._size.toJSON();
    if (this._position.isUse) json.position = this._position.toJSON();

    return json;
  };

  getXmlJson = async (scale, file_path, editor_server_directory, editor_server_download_directory, temp_suffix) => {
    const json = {
      "Type": this._type,
    };

    if (Util.isEmpty(this._src)) {
      return null;
    }

    if (this._type === Constants.TEXT) {
      await this.createTextImage(file_path, editor_server_directory, temp_suffix);
      json.Src = this._src
      json.Type = this._type;
    } else if (this._type === Constants.IMAGE) {
      json.Src = this._src
      log.debug(this.log_prefix, '[getXmlJson]', this._src, json.Src)
    } else if (this._type === Constants.VIDEO) {
      json.Src = editor_server_download_directory + Util.getFileName(this.video_name);
      json.VideoStartTime = this._videoStartTime;
      json.VideoEndTime = this._videoEndTime;
    } else {
      return null;
    }
    json.Src = Util.urlToPath(json.Src, true);

    json.MultiLine = this._multiLine;
    json.Padding = Math.round(this._padding * scale);
    json.Resize = this._resize;

    if (this._font.isUse) json.Font = this._font.getXmlJson(scale);
    if (this._backGroundColor.isUse) json.BackGround = this._backGroundColor.getXmlJson();
    if (this._size.isUse) json.Size = this._size.getXmlJson(scale);
    if (this._position.isUse) json.Position = this._position.getXmlJson(scale);

    return json;
  };

  createTextImage = async (file_path, editor_server_directory, temp_suffix) => {
    const font_file_name = this._font.bold ? 'NotoSansCJKkr-Medium' : 'NotoSansCJKkr-Regular';
    const font_name = this._font.bold ? 'Noto Sans CJK KR Medium' : 'Noto Sans CJK KR Regular';
    const options = {
      fontSize: this._font.size,
      fontName: font_name,
      textAlign: this._font.align,
      textColor: this._font.getRGBA(),
      backgroundColor: this._backGroundColor.getRGBA(),
      lineSpacing: this._font.line_height > this._font.size ? this._font.line_height - this._font.size : 0,
      padding: this._padding,
      maxWidth: this._size.getMaxWidth(),
      maxHeight: this._size.getMaxHeight(),
      multiLine: this._multiLine,
      localFontName: font_file_name,
      localFontPath: process.cwd() + '/' + 'font' + '/' + font_file_name + '.otf',
      startX: this._position.getStartX(),
      startY: this._position.getStartY()
    };

    const image_file_path = file_path + temp_suffix + this._id + '.png';
    const editor_image_file_path = editor_server_directory + temp_suffix + this._id + '.png';
    const image_info = await text2png(this._src, options);
    const write_result = await Util.writeFile(image_file_path, image_info.data);
    log.debug(this.log_prefix, '[createTextImage]', image_file_path, this._id, write_result, editor_image_file_path);

    this._type = Constants.IMAGE;
    this._src = editor_image_file_path;
    this._multiLine = false;
    this._padding = 0;
    this._size.width = image_info.width;
    this._size.height = image_info.height;
    this._size.resize = Constants.NONE;

    this._font.isUse = false;
    this._backGroundColor.isUse = false;
    this._size.isUse = true;
    this._position.isUse = true;
  };
}
