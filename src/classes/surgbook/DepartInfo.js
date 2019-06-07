import JsonWrapper from '@/classes/JsonWrapper';

const CUSTOM_CODE = 'ZZZ';

/**
 * @swagger
 * definitions:
 *  DepartInfo:
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
 *      memo:
 *        type: "string"
 *        description: "기타 메모"
 *
 */

export default class DepartInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.ignore_empty = true;
    this.is_custom = data.code == CUSTOM_CODE;
  }

  isCustom = () => {
    return this.is_custom;
  }
}
