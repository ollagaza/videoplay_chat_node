import service_config from '@/config/service.config';
import ModelObject from '@/classes/ModelObject';
import OperationMediaInfo from '@/classes/surgbook/OperationMediaInfo';
import SmilInfo from '@/classes/surgbook/SmilInfo';
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
      media_info.setUrl(operation_info);
    }
    return media_info;
  };

  createOperationMediaInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.seq
    };
    return await this.create(create_params, 'seq');
  };

  syncMediaInfoByXml = async (operation_info) => {
    const media_info = await this.getOperationMediaInfo(operation_info);
    const is_exist = media_info.isEmpty() === false;
    const video_info = await new VideoModel({"database": this.database}).getVideoInfo(operation_info.media_directory);
    if (video_info.isEmpty()) {
      if (!is_exist) {
        await this.createOperationMediaInfo(operation_info);
      }
      return 0;
    }
    if (!is_exist) {
      return await this.createOperationMediaInfoByXML(operation_info);
    } else {
      return await this.updateOperationMediaInfoByXML(operation_info);
    }
  };

  getProxyVideoFileName = (operation_info, origin_file_name, smil_file_name) => {
    if (!smil_file_name) {
      smil_file_name = service_config.get('default_smil_file_name');
    }
    const smil_info = new SmilInfo().loadFromXml(operation_info.media_directory, smil_file_name);
    return smil_info.isEmpty() ? null : smil_info.findProxyVideoFile();
  };

  createOperationMediaInfoByXML = async (operation_info) => {
    const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(operation_info.media_directory);
    if (video_info.isEmpty()) {
      return await this.createOperationMediaInfo(operation_info);
    } else {
      const proxy_file_name = this.getProxyVideoFileName(operation_info, video_info.video_name, null);
      const create_params = {
        "operation_seq": operation_info.seq,
        "video_file_name": video_info.video_name,
        "proxy_file_name": proxy_file_name,
        "fps": video_info.fps,
        "width": video_info.width,
        "height": video_info.height,
        "total_time": Math.ceil(video_info.total_time),
        "total_frame": video_info.total_frame,
        "is_trans_complete": proxy_file_name ? 1 : 0
      };
      return await this.create(create_params, 'seq');
    }
  };

  updateOperationMediaInfoByXML = async (operation_info) => {
    const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(operation_info.media_directory);
    if (video_info.isEmpty()) {
      return 0;
    } else {
      const proxy_file_name = this.getProxyVideoFileName(operation_info, video_info.video_name, null);
      const update_params = {
        "video_file_name": video_info.video_name,
        "proxy_file_name": proxy_file_name,
        "fps": video_info.fps,
        "width": video_info.width,
        "height": video_info.height,
        "total_time": Math.ceil(video_info.total_time),
        "total_frame": video_info.total_frame,
        "is_trans_complete": proxy_file_name ? 1 : 0
      };

      return await this.update({operation_seq: operation_info.seq}, update_params);
    }
  };

  updateTransComplete = async (operation_info, trans_info) => {
    let proxy_file_name = this.getProxyVideoFileName(operation_info, trans_info.video_file_name, trans_info.smil_file_name);
    const update_params = {
      "video_file_name": trans_info.video_file_name,
      "proxy_file_name": proxy_file_name,
      "smil_file_name": trans_info.smil_file_name,
      "is_trans_complete": proxy_file_name ? 1 : 0,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({operation_seq: operation_info.seq}, update_params);
  };
}
