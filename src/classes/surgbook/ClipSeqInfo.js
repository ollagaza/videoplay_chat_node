import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';

const dest_rename_regex = /^[\w]+\\([\w]+)\.([\w]+)$/i;

export default class ClipSeqInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['seq_id', 'clip_num', 'seq_num', 'unique_id', 'url', 'start_time', 'end_time', 'dest', 'desc']);
  }

  setByXML = (xml_info, clip_info) => {
    if (!xml_info) {
      return this;
    }

    this.seq_id = this.getXmlText(xml_info.SeqId);
    this.clip_num = clip_info.clip_num;
    this.seq_num = xml_info._;
    this.unique_id = clip_info.unique_id;
    this.url = clip_info.url;
    this.start_time = Util.timeStrToSecond(this.getXmlText(xml_info.StartTime));
    this.end_time = Util.timeStrToSecond(this.getXmlText(xml_info.EndTime));
    this.dest = clip_info.url_prefix + this.getXmlText(xml_info.Dest).replace("\\", "/");
    this.desc = this.getXmlText(xml_info.Desc);

    return this;
  }

  getXmlInfo = (dest) => {
    return {
      "_": this.seq_num,
      "StartTime": [Util.secondToTimeStr(this.start_time)],
      "EndTime": [Util.secondToTimeStr(this.end_time)],
      "Dest": [dest],
      "Desc": [this.desc],
      "SeqId": [this.seq_id]
    }
  }
}
