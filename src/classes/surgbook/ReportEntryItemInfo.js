import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';

/**
 * @swagger
 * definitions:
 *  ReportEntryItemInfo:
 *    type: "object"
 *    description: "동영상 리포트 수술 기록 첨부 인덱스 정보"
 *    required:
 *    - "unique_id"
 *    - "start_time"
 *    - "url"
 *    properties:
 *      unique_id:
 *        type: "string"
 *        description: "첨부 인덱스 고유 아이디"
 *      start_time:
 *        type: "integer"
 *        description: "첨부 인덱스 시작시간"
 *      url:
 *        type: "string"
 *        description: "첨부 인덱스 이미지 URL"
 *
 */

export default class ReportEntryItemInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['unique_id', 'start_time', 'url']);
  }

  getFromXML = (xml_info, url_prefix) => {
    if (xml_info) {
      const src = xml_info.$.Src;
      this.unique_id = src;
      this.start_time = Util.timeStrToSecond(xml_info.$.Time);
      this.url = url_prefix + src.replace("\\", "/");
    }

    return this;
  }

  getXmlJson = () => {
    return {
      "$": {
        "Src": this.unique_id,
        "Time": Util.secondToTimeStr(this.start_time)
      }
    }
  }
}
