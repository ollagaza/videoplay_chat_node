import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationService from '../operation/OperationService'
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';
import SmilInfo from '../../wrapper/xml/SmilInfo'
import Constants from '../../constants/constants'

const OperationMediaServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationMediaService]'
  }

  getOperationMediaModel = (database) => {
    if (database) {
      return new OperationMediaModel(database)
    }
    return new OperationMediaModel(DBMySQL)
  }

  createOperationMediaInfo = async (database, operation_info) => {
    const operation_media_model = this.getOperationMediaModel(database)
    return await operation_media_model.createOperationMediaInfo(operation_info);
  }

  getOperationMediaInfo = async (database, operation_info) => {
    const operation_media_model = this.getOperationMediaModel(database)
    return await operation_media_model.getOperationMediaInfo(operation_info)
  }

  getProxyVideoInfo = async (directory_info, smil_file_name) => {
    if (!smil_file_name) {
      smil_file_name = ServiceConfig.get('default_smil_file_name');
    }
    const smil_info = await new SmilInfo().loadFromXml(directory_info.media_origin, smil_file_name);
    return smil_info.isEmpty() ? { name: null, resolution: ServiceConfig.get('proxy_max_resolution') } : smil_info.findProxyVideoInfo();
  };

  updateTranscodingComplete = async (database, operation_info, video_file_name, smil_file_name) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_result = await Util.getMediaInfo(directory_info.media_origin + '/' + video_file_name)
    if (!media_result.success || media_result.media_type !== Constants.VIDEO) {
      throw new StdObject(-1, '동영상 파일이 아닙니다.', 400)
    }
    const media_info = media_result.media_info
    const proxy_info = await this.getProxyVideoInfo(directory_info, smil_file_name);

    const update_params = {
      "video_file_name": video_file_name,
      "proxy_file_name": proxy_info.name,
      "fps": media_info.fps,
      "width": media_info.width,
      "height": media_info.height,
      "total_frame": media_info.frame_count,
      "total_time": media_info.duration,
      "smil_file_name": smil_file_name,
      "proxy_max_height": proxy_info.resolution,
      "is_trans_complete": proxy_info.name ? 1 : 0
    };

    const operation_media_model = this.getOperationMediaModel(database)
    await operation_media_model.updateTransComplete(operation_info.seq, update_params)
  }
}

const operation_media_service = new OperationMediaServiceClass()
export default operation_media_service
