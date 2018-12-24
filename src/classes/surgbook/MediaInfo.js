import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  MediaInfo:
 *    type: "object"
 *    description: "동영상 정보"
 *    properties:
 *      media_id:
 *        type: "integer"
 *        description: "동영상 고유번호"
 *      file_count:
 *        type: "integer"
 *        description: "파일 개수"
 *      file_size:
 *        type: "integer"
 *        description: "파일 용량 (MB)"
 *      runtime:
 *        type: "integer"
 *        description: "동영상 길이 (sec)"
 *
 */

export default class MediaInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);

    this.setKeys(['media_id', 'file_count', 'file_size', 'runtime']);
  }

  getByOperationInfo = (operation_info) => {
    if (operation_info != null) {
      this.media_id = operation_info.ID;
      this.file_count = operation_info.FileNo;
      this.file_size = operation_info.FileSize;
      this.runtime = operation_info.RunTime;
      this.media_root = operation_info.MediaRoot;
      this.doctor_name = operation_info.Name;
    }

    return this;
  }
}
