import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  VideoInfo:
 *    type: "object"
 *    required:
 *    - "code"
 *    - "name"
 *    description: "병원 정보"
 *    properties:
 *      code:
 *        type: "string"
 *        description: "병권 코드"
 *      name:
 *        type: "string"
 *        description: "병원 명"
 *      address:
 *        type: "string"
 *        description: "병원 주소"
 *      telephone:
 *        type: "string"
 *        description: "병원 연락처"
 *      manager_name:
 *        type: "string"
 *        description: "병원 담당자 명"
 *      manager_tel:
 *        type: "string"
 *        description: "병원 담당자 연락처"
 *      memo:
 *        type: "string"
 *        description: "기타 메모"
 *
 */

export default class ServiceErrorInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.ignore_empty = true;
    this.is_checked = data ? data.is_checked === 1 : false;
  }

  isCustom = () => {
    return this.is_checked;
  }
}