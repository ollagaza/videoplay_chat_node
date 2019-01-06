import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  FileInfo:
 *    type: "object"
 *    description: "파일 정보"
 *    properties:
 *      code:
 *        type: "string"
 *        description: "병권 코드"
 *      name:
 *        type: "string"
 *        description: "병원 명"
 *      memo:
 *        type: "string"
 *        description: "기타 메모"
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
