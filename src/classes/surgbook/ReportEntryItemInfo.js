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
 *      original_url:
 *        type: "string"
 *        description: "클립 인덱스 이미지의 URL (원본크기)"
 *      thumbnail_url:
 *        type: "string"
 *        description: "클립 인덱스 이미지의 URL (작은크기)"
 *
 */

export default class ReportEntryItemInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['unique_id', 'start_time', 'original_url', 'thumbnail_url']);
  }

  getFromXML = (xml_info) => {
    if (xml_info) {
      this.unique_id = xml_info.$.ID;
      this.start_time = Util.timeStrToSecond(xml_info.$.Time);
      this.original_url = this.getXmlText(xml_info.Original);
      this.thumbnail_url = this.getXmlText(xml_info.Thumbnail);

      this.is_empty = false;
    }

    return this;
  }

  getXmlJson = () => {
    return {
      "$": {
        "ID": this.unique_id,
        "Time": Util.secondToTimeStr(this.start_time)
      },
      "Original": this.original_url,
      "Thumbnail": this.thumbnail_url
    }
  }
}
