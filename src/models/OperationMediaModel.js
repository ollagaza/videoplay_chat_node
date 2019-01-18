import ModelObject from '@/classes/ModelObject';
import OperationMediaInfo from '@/classes/surgbook/OperationMediaInfo';
import VideoModel from "@/models/xmlmodel/VideoModel";

export default class OperationMediaModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_media';
    this.selectable_fields = ['*'];
  }

  getOperationMediaInfo = async (operation_info) => {
    const media_info = new OperationMediaInfo(await this.findOne({operation_seq: operation_info.seq}));
    if (!media_info.isEmpty()) {
      media_info.setUrl(operation_info.media_directory, operation_info.url_prefix);
    }
    return media_info;
  };

  createOperationMediaInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.operation_seq
    };
    return await this.create(create_params, 'seq');
  };

  createOperationMediaInfoByXML = async (operation_info) => {
    const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(operation_info.media_directory);
    if (video_info.isEmpty()) {
      return await this.createOperationMediaInfo(operation_info);
    } else {
      const create_params = {
        operation_seq: operation_info.operation_seq,
        video_file_name: video_info.video_name,
        proxy_file_name: video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_'),
        fps: video_info.fps,
        width: video_info.width,
        height: video_info.height,
        total_time: Math.ceil(video_info.total_time),
        total_frame: video_info.total_frame,
        is_active: 1
      };
      return await this.create(create_params, 'seq');
    }
  };

  updateTransComplete = async (operation_info, trans_info) => {
    const update_params = {
      "video_file_name": trans_info.video_file_name,
      "smil_file_name": trans_info.smil_file_name,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({operation_seq: operation_info.seq}, update_params);
  };

  updateOperationMediaInfoByXML = async (operation_info) => {
    const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(operation_info.media_directory);
    if (video_info.isEmpty()) {
      return await this.createOperationMediaInfo(operation_info);
    } else {
      const update_params = {
        video_file_name: video_info.video_name,
        proxy_file_name: video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_'),
        fps: video_info.fps,
        width: video_info.width,
        height: video_info.height,
        total_time: Math.ceil(video_info.total_time),
        total_frame: video_info.total_frame,
        is_active: 1
      };

      return await this.update({operation_seq: operation_info.operation_seq}, update_params);
    }
  };
}
