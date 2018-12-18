import _ from 'lodash';
import IndexInfo from '@/classes/surgbook/IndexInfo';
import IndexFileInfo from '@/classes/surgbook/IndexFileInfo';
import StdObject from "@/classes/StdObject";
import Util from '@/utils/baseutil';

export default class IndexModel {
  constructor() {
  }

  loadIndexXML = async (media_info, index_type) => {
    // index1, index2, media xml은 readonly이기 때문에 _change에 내용을 복사하고 _change xml만 수정한다.
    const media_directory = media_info.media_directory;
    const origin_file_name = 'Index' + index_type + '.xml';
    let file_name;
    if(index_type == 1){
      file_name = origin_file_name;
    }
    else {
      file_name = 'Custom.xml';
      if (!Util.fileExists(media_directory + file_name)) {
        await Util.copyFile(media_directory + origin_file_name, media_directory + file_name);
      }
    }

    return await Util.loadXmlFile(media_directory, file_name);
  }

  getIndexlist = async (media_info, index_type) => {
    const index_xml_info = await this.loadIndexXML(media_info, index_type);
    const index_info_list = new Array();

    if (!Util.isEmpty(index_xml_info) && !Util.isEmpty(index_xml_info.IndexInfo)) {
      const video_info = media_info.video_info;
      const total_time = video_info.total_time;
      const total_frame = video_info.total_frame;
      const fps = video_info.fps;
      const url_prefix = media_info.url_prefix;
      const default_directory = 'INX' + index_type;
      let index_xml_list = index_xml_info.IndexInfo.Index;
      const list_length = index_xml_list.length;

      let prev_frame = 0;
      let current_frame = 0;
      let add_frames = 0;
      let prev_info = null;
      for (let i = 0; i < list_length; i++) {
        const xml_info = index_xml_list[i];
        const xml_attr = xml_info.$ ? xml_info.$ : {};
        const index_info = {};

        const index_name = xml_info._;
        const file_info = new IndexFileInfo(index_name);
        const frame = file_info.getFrame();
        const directory = xml_attr.directory || default_directory;

        index_info.id = index_name;
        index_info.unique_id = directory + '\\' + index_name;
        index_info.video_name = file_info.getVideoName();
        index_info.job_id = file_info.getJobId();
        index_info.create_type = 'M' === xml_attr.type ? 'M' : 'A';
        index_info.url = url_prefix + directory + '/' + index_name;

        if (prev_frame > frame) {
          add_frames = current_frame;
        }
        current_frame = frame + add_frames;

        index_info.start_time = Math.round(current_frame * 1000 / fps)/1000;
        index_info.start_frame = current_frame;
        if (prev_info != null) {
          prev_info.end_time = index_info.start_time;
          prev_info.end_frame = current_frame - 1;
        }

        index_info.suffix = file_info.getSuffix();
        index_info.add_frames = add_frames;
        index_info.info_frame = frame;
        index_info.directory = directory;

        prev_info = new IndexInfo(index_info);
        index_info_list.push(prev_info);
      }

      if (prev_info != null) {
        prev_info.end_time = total_time;
        prev_info.end_frame = total_frame;
      }
    }

    return index_info_list;
  }

  addIndex = async (media_info, second) => {
    const video_info = media_info.video_info;
    const fps = video_info.fps;
    const target_frame = Math.round(second * fps);

    const index2_info_list = await this.getIndexlist(media_info, 2);
    const total_count = index2_info_list.length;
    let insert_index = -1;
    let copy_index_info = null;

    for (let i = 0; i < total_count; i++) {
      const index2_info = index2_info_list[i];
      const start_frame = index2_info.start_frame;
      const end_frame = index2_info.end_frame;

      if (start_frame == target_frame) {
        throw new StdObject(-1, '동일한 인덱스 존재합니다.', 400);
      } else if(i == 0 && target_frame < start_frame){
        copy_index_info = index2_info;
        insert_index = i;
        break;
      } else if (target_frame > start_frame && target_frame <= end_frame) {
        copy_index_info = index2_info;
        insert_index = i+1;
        break;
      }
    }

    const add_index = {};
    add_index.start_frame = target_frame;
    if (null === copy_index_info) {
      copy_index_info = index2_info_list[total_count - 1];
      add_index.end_frame = video_info.total_frame;
    }
    else {
      add_index.end_frame = copy_index_info.end_frame - 1;
    }

    const video_name = copy_index_info.video_name;
    const job_id = copy_index_info.job_id;
    const info_frame = target_frame - copy_index_info.add_frames;
    const suffix = copy_index_info.suffix;

    const add_index_file_name = video_name + '_' + job_id + '_' + info_frame + '_' + suffix + '_0.jpg';
    add_index.id = add_index_file_name;
    add_index.directory = 'Custom';
    add_index.create_type = 'M';
    add_index.start_time = second;
    add_index.end_time = copy_index_info.start_time;
    add_index.url = media_info.url_prefix + 'Custom/' + add_index_file_name;

    const add_index_info = new IndexInfo(add_index);

    if (insert_index >= 0) {
      index2_info_list.splice(insert_index, 0, add_index_info);
    } else {
      index2_info_list.push(add_index_info);
    }

    const media_directory = media_info.media_directory;
    const video_source = media_info.video_source;
    const target_time_str = Util.secondToTimeStr(second);
    const save_directory = media_directory + 'Custom';
    if (!Util.fileExists(save_directory)) {
      Util.createDirectory(save_directory);
    }
    const add_index_image_path = save_directory + '\\' + add_index_file_name;
    const command = 'ffmpeg -ss ' + target_time_str + ' -i "' + video_source + '" -y -vframes 1 -an "' + add_index_image_path + '"';
    const execute_result = await Util.execute(command);
    if (execute_result.isSuccess() == false) {
      throw new StdObject(-1, '인덱스 추출 실패', 400);
    }

    await this.saveIndexList(media_directory, index2_info_list);

    this.addHistory(media_directory, 'add', [add_index_info]);

    return add_index_info;
  }

  saveIndexList = async (media_directory, index_info_list) => {
    const index_node_list = new Array();
    const list_length = index_info_list.length;
    for (let i = 0; i < list_length; i++) {
      index_node_list.push(index_info_list[i].getXmlInfo());
    }

    const index_xml_info = {
      "IndexInfo": {
        "Index": index_node_list
      }
    };

    await Util.writeXmlFile(media_directory, "Custom.xml", index_xml_info);
  }

  addHistory = async (media_directory, action_type, change_index_list) => {
    if (!change_index_list || change_index_list.length <= 0) {
      return;
    }

    const history_id = new Date().getTime();
    const index_list_length = change_index_list.length;
    const index_list = new Array();
    for (const key in change_index_list) {
      index_list.push(change_index_list[key].id);
    }
    const new_history = {
      "$": {
        "id": history_id,
        "action": action_type,
        "cursor": "y"
      },
      "firstIndex": [change_index_list[0].id],
      "startFrame": [change_index_list[0].start_frame],
      "endFrame": [change_index_list[index_list_length - 1].end_frame],
      "indexList": [
        {
          "index": index_list
        }
      ]
    };

    const history_xml_info = await Util.loadXmlFile(media_directory, 'History.xml');
    if (history_xml_info && history_xml_info.historyInfo && history_xml_info.historyInfo.history) {
      let history_list = history_xml_info.historyInfo.history;
      history_list.push(new_history);
    }

    Util.writeXmlFile(media_directory, 'History.xml', history_xml_info);
  }
}
