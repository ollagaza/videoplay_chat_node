import JsonWrapper from '@/classes/JsonWrapper';
import ClipSeqInfo from "@/classes/surgbook/ClipSeqInfo";

export default class ClipInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(['clip_num', 'source', 'unique_id', 'url', 'seq_count']);
  }

  setByXML = (xml_info, media_info) => {
    if (!xml_info) {
      return this;
    }

    this.url_prefix = media_info.url_prefix;

    this.clip_num = xml_info._;
    this.source = this.getXmlText(xml_info.Source);
    this.unique_id = this.getXmlText(xml_info.Index);
    this.seq_count = xml_info.Seq ? xml_info.Seq.length : 0;
    this.url = this.url_prefix + this.unique_id.replace("\\", "/");
    this.seq_list = new Array();

    for (let i = 0; i < this.seq_count; i++) {
      this.seq_list.push(new ClipSeqInfo().setByXML(xml_info.Seq[i], this))
    }

    return this;
  }

  getXmlInfo = () => {
    return {
      "_": this.clip_num,
      "Source": [this.source],
      "Index": [this.unique_id],
      "Seq": []
    }
  }
}
