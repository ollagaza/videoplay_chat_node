import _ from 'lodash';

import ServiceConfig from '../../service/service-config';
import Constants from '../../constants/constants'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'

import IndexInfo from '@/classes/surgbook/IndexInfo';

export default class IndexModel {
  constructor() {
    this.log_prefix = '[IndexModel]'
  }

  loadIndexXML = async (operation_info, index_type) => {
    const media_directory = operation_info.media_directory;
    const origin_file_name = 'Index' + index_type + '.xml';

    return await Util.loadXmlFile(media_directory, origin_file_name);
  };

  getIndexList = async (operation_info, index_type) => {
    const index_xml_info = await this.loadIndexXML(operation_info, index_type);
    const index_info_list = [];

    if (!Util.isEmpty(index_xml_info) && !Util.isEmpty(index_xml_info.IndexInfo)) {
      const media_info = operation_info.media_info;
      const total_time = media_info.total_time;
      const total_frame = media_info.total_frame;
      const index_xml_list = index_xml_info.IndexInfo.Index;
      const list_length = index_xml_list.length;

      let prev_info = null;
      for (let i = 0; i < list_length; i++) {
        const index_info = new IndexInfo().getFromXML(index_xml_list[i]);
        if (prev_info != null) {
          prev_info.end_time = index_info.start_time;
          prev_info.end_frame = index_info.start_time - 1;
        }
        index_info_list.push(index_info);
        prev_info = index_info;
      }

      if (prev_info != null) {
        prev_info.end_time = total_time;
        prev_info.end_frame = total_frame;
      }
    }

    return index_info_list;
  };

  addIndex = async (operation_info, second) => {
    const media_info = operation_info.media_info;
    const fps = media_info.fps;
    const target_frame = Math.round(second * fps);

    let index2_info_list = await this.getIndexList(operation_info, 2);
    const total_count = index2_info_list.length;
    let copy_index_info = null;

    for (let i = 0; i < total_count; i++) {
      const index2_info = index2_info_list[i];
      const start_frame = index2_info.start_frame;
      const end_frame = index2_info.end_frame;

      if (start_frame === target_frame) {
        throw new StdObject(-1, '동일한 인덱스 존재합니다.', 400);
      } else if(i === 0 && target_frame < start_frame){
        copy_index_info = index2_info;
        break;
      } else if (target_frame > start_frame && target_frame <= end_frame) {
        copy_index_info = index2_info;
        break;
      }
    }

    let end_time = 0;
    let end_frame = 0;
    if (null === copy_index_info) {
      end_frame = media_info.total_frame;
      end_time = media_info.total_time;
    }
    else {
      end_frame = copy_index_info.end_frame - 1;
      end_time = copy_index_info.end_time;
    }

    const index_file_name = `index_original_${target_frame}_${Date.now()}.jpg`;
    const thumbnail_file_name = `index_thumbnail_${target_frame}_${Date.now()}.jpg`;

    const add_index = {};
    add_index.url = operation_info.url_prefix + 'Thumb/' + index_file_name;
    add_index.original_url = operation_info.url_prefix + 'Thumb/' + index_file_name;
    add_index.thumbnail_url = operation_info.url_prefix + 'Thumb/' + thumbnail_file_name;
    add_index.creator = 'user';
    add_index.unique_id = "user/" + index_file_name;
    add_index.start_time = second;
    add_index.start_frame = target_frame;
    add_index.end_time = end_time;
    add_index.end_frame = end_frame;

    const add_index_info = new IndexInfo(add_index);
    index2_info_list.push(add_index_info);
    index2_info_list = _.sortBy(index2_info_list, index2_info => index2_info.start_frame);

    const media_directory = operation_info.media_directory;
    const origin_video_path = operation_info.media_info.origin_video_path;
    const save_directory = media_directory + 'Thumb';
    if ( !( await Util.fileExists(save_directory) ) ) {
      await Util.createDirectory(save_directory);
    }

    const original_index_image_path = save_directory + Constants.SEP + index_file_name;
    let execute_result = await Util.getThumbnail(origin_video_path, original_index_image_path, second);

    if (!execute_result.success) {
      log.error(this.log_prefix, `IndexModel.addIndex execute error [${execute_result.command}]`, execute_result);
      throw new StdObject(-1, '인덱스 추출 실패', 400);
    }
    if ( !( await Util.fileExists(original_index_image_path) ) ) {
      log.error(this.log_prefix, `IndexModel.addIndex file not exists [${execute_result.command}]`, execute_result);
      throw new StdObject(-1, '인덱스 파일 저장 실패', 400);
    }

    try {
      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212);
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160);
      const thumb_index_image_path = save_directory + Constants.SEP + thumbnail_file_name;
      execute_result = await Util.getThumbnail(origin_video_path, thumb_index_image_path, second, thumb_width, thumb_height);

      if (!execute_result.success) {
        log.error(this.log_prefix, `IndexModel.addIndex thumb execute error [${execute_result.command}]`, execute_result);
      } else if ( !( await Util.fileExists(original_index_image_path) ) ) {
        log.error(this.log_prefix, `IndexModel.addIndex thumb file not exists [${execute_result.command}]`, execute_result);
      }
    } catch (error) {
      add_index.thumbnail_url = add_index.original_url;
    }

    await this.saveIndexList(media_directory, index2_info_list);

    return {add_index_info: add_index_info, total_index_count: index2_info_list.length};
  };

  saveIndexList = async (media_directory, index_info_list) => {
    const index_node_list = [];
    const list_length = index_info_list.length;
    for (let i = 0; i < list_length; i++) {
      index_node_list.push(index_info_list[i].getXmlJson());
    }

    const index_xml_info = {
      "IndexInfo": {
        "Index": index_node_list
      }
    };

    await Util.writeXmlFile(media_directory, "Index2.xml", index_xml_info);
  }
}
