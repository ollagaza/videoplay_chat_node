import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  IndexInfo:
 *    type: "object"
 *    description: "추출된 인덱스 정보"
 *    properties:
 *      unique_id:
 *        type: "string"
 *        description: "인덱스의 고유 아이디"
 *      video_name:
 *        type: "string"
 *        description: "인덱스가 만들어진 원본 동영상 파일명"
 *      create_type:
 *        type: "string"
 *        description: "인덱스 생성 방식 (A: 자동, M: 수동)"
 *      url:
 *        type: "string"
 *        description: "인덱스 이미지 url"
 *      start_time:
 *        type: "number"
 *        description: "인덱스 구간의 시작시간"
 *      end_time:
 *        type: "number"
 *        description: "인덱스 구간의 종료시간"
 *
 */

export default class IndexInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['unique_id', 'video_name', 'create_type', 'url', 'start_time', 'end_time']);
  }

  getXmlJson = () => {
    return {
      "_": this.id,
      "$": {
        "type": this.create_type,
        "directory": this.directory
      }
    }
  }
}
