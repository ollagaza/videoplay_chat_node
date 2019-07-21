import service_config from '@/config/service.config';
import ModelObject from '@/classes/ModelObject';
import OperationMediaInfo from '@/classes/surgbook/OperationMediaInfo';
import SmilInfo from '@/classes/surgbook/SmilInfo';
import Util from '@/utils/baseutil';

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

  getProxyVideoInfo = async (operation_info, origin_file_name, smil_file_name) => {
    if (!smil_file_name) {
      smil_file_name = service_config.get('default_smil_file_name');
    }
    const trans_video_directory = Util.getMediaDirectory(service_config.get('trans_video_root'), operation_info.media_path);
    const smil_info = await new SmilInfo().loadFromXml(trans_video_directory, smil_file_name);
    return smil_info.isEmpty() ? { name: null, resolution: service_config.get('proxy_max_resolution') } : smil_info.findProxyVideoInfo();
  };

  updateTransComplete = async (operation_info, trans_info) => {
    const proxy_info = await this.getProxyVideoInfo(operation_info, trans_info.video_file_name, trans_info.smil_file_name);
    const update_params = {
      "video_file_name": trans_info.video_file_name,
      "proxy_file_name": proxy_info.name,
      "smil_file_name": trans_info.smil_file_name,
      "proxy_max_height": proxy_info.resolution,
      "is_trans_complete": proxy_info.name ? 1 : 0,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({operation_seq: operation_info.seq}, update_params);
  };

  updateVideoInfo = async (operation_info, video_info) => {
    video_info.setKeys(['fps', 'width', 'height', 'total_time', 'total_frame']);
    return await this.update({operation_seq: operation_info.seq}, video_info.toJSON());
  };

  reSetOperationMedia = async (operation_info) => {
    const update_params = {
      "video_file_name": null,
      "proxy_file_name": null,
      "fps": 0,
      "width": 0,
      "height": 0,
      "total_time": 0,
      "total_frame": 0,
      "smil_file_name": null,
      "is_trans_complete": 0,
      "thumbnail": null,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({operation_seq: operation_info.seq}, update_params);
  }
}
