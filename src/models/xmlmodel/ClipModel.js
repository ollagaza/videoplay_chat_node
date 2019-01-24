import _ from 'lodash';
import ModelObject from '@/classes/ModelObject';
import ClipInfo from "@/classes/surgbook/ClipInfo";
import ClipSeqInfo from "@/classes/surgbook/ClipSeqInfo";
import Util from '@/utils/baseutil';

const DOC_VERSION = "1.0";

export default class ClipModel extends ModelObject {
  constructor(...args) {
    super(...args);
  }

  getClipInfo = async (operation_info) => {
    const clip_xml_info = await Util.loadXmlFile(operation_info.media_directory, 'Clip.xml');
    const clip_list = new Array();
    let clip_seq_list = new Array();

    if (clip_xml_info
        && clip_xml_info.ClipInfo
        && clip_xml_info.ClipInfo.$
        && clip_xml_info.ClipInfo.$.doc_version
        && clip_xml_info.ClipInfo.Clip) {

      const clip_xml_list = clip_xml_info.ClipInfo.Clip;
      clip_xml_list.forEach((clip_xml) => {
        const clip_info = new ClipInfo().getFromXML(clip_xml, operation_info);
        clip_list.push(clip_info);
        clip_seq_list = clip_seq_list.concat(clip_info.seq_list);
      });
    }

    return {"clip_list": clip_list, "clip_seq_list": clip_seq_list};
  }

  saveClipInfo = async (operation_info, clip_info) => {
    const clip_map = {};
    const clip_list = new Array();
    const fps = operation_info.media_info.fps;

    clip_info.clip_list.forEach((clip_info_json) => {
      const clip_info = new ClipInfo(clip_info_json);
      clip_info.setExportXml(true);
      clip_list.push(clip_info);

      clip_map[clip_info.unique_id] = clip_info;
    });

    let clip_count = 0;
    clip_info.clip_seq_list.forEach((clip_seq_info_json) => {
      const clip_seq_info = new ClipSeqInfo(clip_seq_info_json);
      const clip_info = clip_map[clip_seq_info.unique_id];

      if (clip_info) {
        clip_seq_info.setExportXml(true);
        clip_seq_info.setDest(clip_info.source, fps);

        clip_info.addSeqInfo(clip_seq_info);
        clip_count++;
      }
    });

    const clip_xml_json = {
      "ClipInfo": {
        "$": {
          "doc_version": DOC_VERSION
        },
        "Clip": clip_list
      }
    };

    await Util.writeXmlFile(operation_info.media_directory, 'Clip.xml', clip_xml_json);

    return clip_count;
  }
}
