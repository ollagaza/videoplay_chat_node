import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';
import mime from 'mime-types';
import path from 'path';
import constants from '@/config/constants';

const getFileType = async (mime_type, file_name, file_path) => {
  if (Util.isEmpty(mime_type)) {
    mime_type = 'etc';
  } else {
    mime_type = mime_type.toLowerCase();
    if (mime_type === 'application/octet-stream') {
      mime_type = 'bin';
    } else if (mime_type.startsWith('video')) {
      mime_type = 'video';
    } else if (mime_type.startsWith('image')) {
      mime_type = 'image';
    }  else if (mime_type.indexOf('text') >= 0) {
      mime_type = 'text';
    } else if (mime_type.indexOf('ms-excel') >= 0 || mime_type.indexOf('spreadsheetml') >= 0) {
      mime_type = 'excel';
    } else if (mime_type.indexOf('word') >= 0) {
      mime_type = 'word';
    } else if (mime_type.indexOf('powerpoint') >= 0 || mime_type.indexOf('presentationml') >= 0) {
      mime_type = 'powerpoint';
    } else if (mime_type.indexOf('pdf') >= 0) {
      mime_type = 'pdf';
    } else if (mime_type.indexOf('audio') >= 0) {
      mime_type = 'audio';
    } else if (mime_type.indexOf('compressed') >= 0 || mime_type.indexOf('zip') >= 0 || mime_type.indexOf('tar') >= 0) {
      mime_type = 'archive';
    } else if (mime_type.indexOf('hwp') >= 0) {
      mime_type = 'hwp';
    } else if (mime_type.indexOf('xml') >= 0) {
      mime_type = 'xml';
    } else {
      const file_ext = path.extname(file_name);
      if (file_ext !== 'smil') {
        const media_info = await Util.getMediaInfo(file_path);
        switch (media_info.media_type) {
          case constants.MEDIA_VIDEO:
            mime_type = 'video';
            break;
          case constants.MEDIA_AUDIO:
            mime_type = 'audio';
            break;
          case constants.MEDIA_IMAGE:
            mime_type = 'image';
            break;
          default:
            mime_type = 'etc';
        }
      } else {
        mime_type = 'etc';
      }
    }
  }

  return mime_type;
};

/**
 * @swagger
 * definitions:
 *  FileInfo:
 *    type: "object"
 *    description: "파일 정보"
 *    properties:
 *      seq:
 *        type: "integer"
 *        description: "파일 고유 번호"
 *      storage_seq:
 *        type: "integer"
 *        description: "저장공간 고유 번호"
 *      file_name:
 *        type: "string"
 *        description: "파일 이름"
 *      file_size:
 *        type: "string"
 *        description: "파일 용량"
 *      file_type:
 *        type: "string"
 *        description: "파일 종류"
 *      url:
 *        type: "string"
 *        description: "파일 다운로드 url"
 *      thumbnail_url:
 *        type: "string"
 *        description: "썸네일 url"
 *
 */

/*
upload_file_info : {
  fieldname: 'target',
  originalname: 'Proxy_180510_000167418_M_s001.mp4',
  encoding: '7bit',
  mimetype: 'video/mp4',
  destination: 'c:\\node-temp\\temp',
  filename: 'Proxy_180510_000167418_M_s001.mp4',
  path: 'c:\\node-temp\\temp\\Proxy_180510_000167418_M_s001.mp4',
  size: 263319437
};
*/

export default class FileInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.setKeys([
      'seq', 'storage_seq', 'file_name', 'file_size', 'file_type', 'url', 'thumbnail_url'
    ]);
  }

  setUrl = (media_root) => {
    if (this.file_path) {
      this.url = Util.pathToUrl(media_root + this.file_path, false);
    }
    if (this.thumbnail) {
      this.thumbnail_url = Util.pathToUrl(media_root + this.thumbnail);
    }

    return this;
  };

  getByUploadFileInfo = async (upload_file_info, media_path) => {
    this.setIgnoreEmpty(true);

    this.setKeys([
      'file_name', 'file_size', 'file_type', 'file_path'
    ]);

    this.file_name = upload_file_info.originalname;
    this.file_size = upload_file_info.size;
    this.file_path = media_path + '\\' + upload_file_info.new_file_name;

    const file_type = await getFileType(upload_file_info.mimetype, this.file_name, this.file_path);
    this.file_type = file_type;

    this.is_empty = false;

    return this;
  };

  getByFilePath = async (file_path, media_path, file_name) => {
    this.setIgnoreEmpty(true);

    this.setKeys([
      'file_name', 'file_size', 'file_type', 'file_path'
    ]);

    const file_stat = await Util.getFileStat(file_path);
    const file_size = file_stat ? file_stat.size : 0;

    this.file_name = file_name;
    this.file_size = file_size;
    this.file_path = media_path + '\\' + this.file_name;

    const file_type = await getFileType(mime.lookup(file_path), file_name, file_path);
    this.file_type = file_type;

    this.is_empty = false;

    return this;
  };
}
