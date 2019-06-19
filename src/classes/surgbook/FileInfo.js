import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';
import mime from 'mime-types';
import Constants from '@/config/constants';

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
    this.file_path = media_path + Constants.SEP + upload_file_info.new_file_name;

    const file_type = await Util.getFileType(upload_file_info.mimetype, this.file_name, this.file_path);
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
    this.file_path = media_path + Constants.SEP + this.file_name;

    const file_type = await Util.getFileType(mime.lookup(file_path), file_name, file_path);
    this.file_type = file_type;

    this.is_empty = false;

    return this;
  };
}
