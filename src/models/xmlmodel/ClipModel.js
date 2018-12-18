import _ from 'lodash';
import StdObject from "@/classes/StdObject";
import ClipInfo from "@/classes/surgbook/ClipInfo";
import ClipSeqInfo from "@/classes/surgbook/ClipSeqInfo";
import Util from '@/utils/baseutil';

export default class ClipModel {
  constructor() {
  }

  getClipList = async (media_info) => {
    const clip_xml_info = await Util.loadXmlFile(media_info.media_directory, 'Clip.xml');
    const clip_list = new Array();
    let clip_seq_list = new Array();

    if (clip_xml_info && clip_xml_info.ClipInfo && clip_xml_info.ClipInfo.Clip) {
      const clip_xml_list = clip_xml_info.ClipInfo.Clip;
      clip_xml_list.forEach((clip_xml) => {
        const clip_info = new ClipInfo().setByXML(clip_xml, media_info);
        clip_list.push(clip_info);
        clip_seq_list = clip_seq_list.concat(clip_info.seq_list);
      });
    }

    return {"clip_list": clip_list, "clip_seq_list": clip_seq_list}
  }
}
