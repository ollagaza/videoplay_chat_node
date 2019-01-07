import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';

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
      'seq', 'file_name', 'file_size', 'file_type', 'url', 'thumbnail_url'
    ]);
  }

  setUrl = (media_root) => {
    if (this.file_path) {
      this.url = Util.pathToUrl(media_root + this.file_path);
    }
    if (this.thumbnail) {
      this.thumbnail_url = Util.pathToUrl(media_root + this.thumbnail);
    }

    return this;
  }

  getByUploadFileInfo = (upload_file_info, media_path) => {
    this.setIgnoreEmpty(true);

    this.setKeys([
      'file_name', 'file_size', 'file_type', 'file_path'
    ]);

    this.file_name = upload_file_info.originalname;
    this.file_size = upload_file_info.size;
    this.file_type = upload_file_info.mimetype;
    this.file_path = media_path + '\\' + this.file_name;

    return this;
  }
}
