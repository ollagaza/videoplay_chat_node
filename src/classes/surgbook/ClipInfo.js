import JsonWrapper from '@/classes/JsonWrapper';
import ClipSeqInfo from "@/classes/surgbook/ClipSeqInfo";

/**
 * @swagger
 * definitions:
 *  Clip:
 *    type: "object"
 *    description: "클립 정보"
 *    required:
 *    - "clip_info_list"
 *    - "clip_seq_info_list"
 *    properties:
 *      clip_info_list:
 *        type: "array"
 *        description: "클립 큐레이션 목록"
 *        items:
 *          $ref: "#definitions/ClipInfo"
 *      clip_seq_info_list:
 *        type: "array"
 *        description: "클립 시퀀스 목록"
 *        items:
 *          $ref: "#definitions/ClipSeqInfo"
 *  ClipInfo:
 *    type: "object"
 *    description: "클립 큐레이션 정보"
 *    required:
 *    - "clip_num"
 *    - "unique_id"
 *    - "source"
 *    properties:
 *      clip_num:
 *        type: "string"
 *        description: "클립 큐레이션 일련 번호"
 *      source:
 *        type: "string"
 *        description: "클립의 원본 동영상 URL"
 *      unique_id:
 *        type: "string"
 *        description: "클립 인덱스의 고유 아이디"
 *      url:
 *        type: "string"
 *        description: "클립 인덱스 이미지의 URL"
 *      seq_count:
 *        type: "integer"
 *        description: "큐레이션에 연결된 시퀀스의 개수"
 *
 */
export default class ClipInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['clip_num', 'source', 'unique_id', 'url', 'seq_count']);
    this.seq_list = new Array();
  }

  getFromXML = (xml_info, media_info) => {
    if (!xml_info) {
      return this;
    }

    this.url_prefix = media_info.url_prefix;

    this.clip_num = xml_info._;
    this.source = this.getXmlText(xml_info.Source);
    this.unique_id = this.getXmlText(xml_info.Index);
    this.seq_count = xml_info.Seq ? xml_info.Seq.length : 0;
    this.url = this.url_prefix + this.unique_id.replace("\\", "/");

    for (let i = 0; i < this.seq_count; i++) {
      this.seq_list.push(new ClipSeqInfo().getFromXML(xml_info.Seq[i], this))
    }

    return this;
  }

  addSeqInfo = (seq_info) => {
    this.seq_list.push(seq_info);
  }

  getXmlJson = () => {
    const xml_info = {
      "_": this.clip_num,
      "Source": [this.source],
      "Index": [this.unique_id],
      "Seq": this.seq_list
    };

    return xml_info;
  }
}
