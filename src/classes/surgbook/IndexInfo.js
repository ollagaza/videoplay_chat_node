import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import JsonWrapper from '@/classes/JsonWrapper';
import service_config from '@/config/service.config';
import Constants from '@/config/constants';
import Util from '@/utils/baseutil';
import log from "@/classes/Logger";


const seq_exp = new RegExp(/\\/, 'g');

/**
 * @swagger
 * definitions:
 *  IndexInfo:
 *    type: "object"
 *    description: "추출된 인덱스 정보"
 *    properties:
 *      unique_id:
 *        type: "string"
 *        description: "인덱스의 고유 아이디"
 *      creator:
 *        type: "string"
 *        description: "인덱스 생성 주체"
 *      original_url:
 *        type: "string"
 *        description: "원본 인덱스 이미지 url"
 *      thumbnail_url:
 *        type: "string"
 *        description: "썸네일 인덱스 이미지 url"
 *      start_time:
 *        type: "number"
 *        description: "인덱스 구간의 시작시간"
 *      end_time:
 *        type: "number"
 *        description: "인덱스 구간의 종료시간"
 *
 */

export default class IndexInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.setKeys(['unique_id', 'creator', 'original_url', 'thumbnail_url', 'start_time', 'end_time', 'start_frame', 'end_frame', 'tags']);
  }

  getFromXML = (index_xml_info) => {
    if (!index_xml_info) {
      return this;
    }

    if (_.isArray(index_xml_info)) {
      index_xml_info = index_xml_info[0];
    }

    this.original_url = Util.getXmlText(index_xml_info.Original);
    this.thumbnail_url = Util.getXmlText(index_xml_info.Thumbnail);
    this.creator = index_xml_info.$.Creator;
    this.unique_id = index_xml_info.$.ID;
    this.start_time = Util.parseFloat(index_xml_info.$.Time);
    this.start_frame = Util.parseFloat(index_xml_info.$.Frame);
    this.end_time = 0;
    this.end_frame = 0;
    this.is_range = false;

    this.is_empty = false;

    return this;
  };

  getFromHawkeyeXML = async (hawkeye_xml_info, check_file_exists=true) => {
    // log.d(null, hawkeye_xml_info);
    if (!hawkeye_xml_info) {
      return this;
    }

    if (_.isArray(hawkeye_xml_info)) {
      hawkeye_xml_info = hawkeye_xml_info[0];
    }

    const service_info = service_config.getServiceInfo();
    const hawkeye_root_regex = new RegExp(`^.*${service_info.hwakeye_index_directory_root}`, 'i');
    const index_directory = service_info.hawkeye_data_directory;

    let origin_file = Util.getXmlText(hawkeye_xml_info.orithumb).replace(hawkeye_root_regex, '');
    let thumb_file = Util.getXmlText(hawkeye_xml_info.thumb).replace(hawkeye_root_regex, '');
    if (Constants.SEP !== '\\') {
      origin_file = origin_file.replace(seq_exp, '/');
      thumb_file = thumb_file.replace(seq_exp, '/');
    }
    const image_file_name = path.basename(origin_file);

    // log.d(null, index_directory, hawkeye_xml_info.orithumb, origin_file, thumb_file);
    // log.d(null, index_directory + origin_file, index_directory + thumb_file);
    // log.d(null, await Util.fileExists(index_directory + origin_file, fs.constants.R_OK), await Util.fileExists(index_directory + thumb_file, fs.constants.R_OK));
    if (check_file_exists) {
      if ( !( await Util.fileExists(index_directory + origin_file, fs.constants.R_OK) ) || !( await Util.fileExists(index_directory + thumb_file, fs.constants.R_OK) ) ) {
        return this;
      }
    }

    const frame = Util.getXmlText(hawkeye_xml_info.frame).split('-');
    const time = Util.getXmlText(hawkeye_xml_info.time).split('-');

    this.is_range = frame.length > 1;
    this.start_frame = Util.parseFloat(frame[0], 0);
    this.end_frame = Util.parseFloat(frame[1], 0);
    this.start_time = Util.parseFloat(time[0], 0);
    this.end_time = Util.parseFloat(time[1], 0);

    this.original_url = service_info.static_index_prefix + Util.pathToUrl(origin_file);
    this.thumbnail_url = service_info.static_index_prefix + Util.pathToUrl(thumb_file);
    this.creator = "system";
    this.unique_id = "system/" + image_file_name;
    const code = Util.getXmlText(hawkeye_xml_info.type);
    this.code = code;
    this.errorid = Util.getXmlText(hawkeye_xml_info.errorid);
    this.state = Util.getXmlText(hawkeye_xml_info.state);
    this.tags = [code];
    this.tag_map = {};
    this.tag_map[code] = true;

    this.is_empty = false;

    return this;
  };

  getXmlJson = () => {
    return {
      "$": {
        "ID": this.unique_id,
        "Creator": this.creator,
        "Frame": this.start_frame,
        "Time": this.start_time
      },
      "Original": this.original_url,
      "Thumbnail": this.thumbnail_url
    };
  }
}
