import JsonWrapper from '@/classes/JsonWrapper';
import ReportEntryItemInfo from "@/classes/surgbook/ReportEntryItemInfo";

/**
 * @swagger
 * definitions:
 *  ReportInfo:
 *    type: "object"
 *    description: "동영상 리포트 수술 기록 목록"
 *    required:
 *    - "sheet_list"
 *    properties:
 *      sheet_list:
 *        type: "array"
 *        description: "동영상 리포트 수술 기록 목록"
 *        items:
 *          $ref: "#definitions/ReportEntryInfo"
 *  ReportEntryInfo:
 *    type: "object"
 *    description: "동영상 리포트 수술 기록"
 *    required:
 *    - "desc"
 *    - "item_list"
 *    properties:
 *      desc:
 *        type: "string"
 *        description: "수술기록"
 *      item_list:
 *        type: "array"
 *        description: "첨부 인덱스 목록"
 *        items:
 *          $ref: "#definitions/ReportEntryItemInfo"
 *
 */

export default class ReportEntryInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['desc', 'item_list']);
    this.item_list = new Array();

    if (data && data.item_list) {
      data.item_list.forEach((item) => {
        const item_info = new ReportEntryItemInfo(item);
        item_info.setExportXml(true);
        this.item_list.push(item_info);
      });
    }
  }

  getFromXML = (xml_info, media_info) => {
    if (xml_info) {
      const url_prefix = media_info.url_prefix;

      this.desc = this.getXmlText(xml_info);
      if (xml_info.Index) {
        xml_info.Index.forEach((item) => {
          this.item_list.push(new ReportEntryItemInfo().getFromXML(item, url_prefix));
        });
      }
    }

    return this;
  }

  getXmlJson = () => {
    const xml_info = {
      "_": this.desc,
      "Index": this.item_list
    };

    return xml_info;
  }
}
