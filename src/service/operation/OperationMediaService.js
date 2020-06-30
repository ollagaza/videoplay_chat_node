import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationService from '../operation/OperationService'
import OperationDataService from '../operation/OperationDataService'
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

  getSmilInfo = async (directory_info, smil_file_name) => {
    if (!smil_file_name) {
      smil_file_name = ServiceConfig.get('default_smil_file_name');
    }
    return await new SmilInfo().loadFromXml(directory_info.origin, smil_file_name);
  }

  getProxyVideoInfo = (smil_info) => {
    return smil_info.isEmpty() ? { name: null, resolution: ServiceConfig.get('proxy_max_resolution') } : smil_info.findProxyVideoInfo();
  };

  updateTranscodingComplete = async (database, operation_info, video_file_name, smil_file_name) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const trans_video_file_path = directory_info.origin + video_file_name
    if (!(await Util.fileExists(trans_video_file_path))) {
      throw new StdObject(-1, '트랜스코딩된 동영상 파일이 존재하지 않습니다.', 400)
    }
    const media_result = await Util.getMediaInfo(trans_video_file_path)
    log.debug(this.log_prefix, '[updateTranscodingComplete]', 'media_result', media_result)
    if (!media_result.success || media_result.media_type !== Constants.VIDEO) {
      throw new StdObject(-1, '동영상 파일이 아닙니다.', 400)
    }
    const media_info = media_result.media_info
    const smil_info = await this.getSmilInfo(directory_info, smil_file_name)
    const proxy_info = this.getProxyVideoInfo(smil_info);
    const proxy_file_name = Util.isEmpty(proxy_info.name) ? video_file_name : proxy_info.name

    const update_params = {
      "video_file_name": video_file_name,
      "proxy_file_name": proxy_file_name,
      "fps": media_info.fps,
      "width": media_info.width,
      "height": media_info.height,
      "total_frame": media_info.frame_count,
      "total_time": media_info.duration,
      "smil_file_name": smil_file_name,
      "proxy_max_height": proxy_info.resolution,
      "is_trans_complete": 1
    };

    const thumbnail_result = await OperationService.createOperationVideoThumbnail(trans_video_file_path, operation_info)
    if (thumbnail_result) {
      update_params.thumbnail = thumbnail_result.path
      try {
        await OperationDataService.setThumbnailAuto(operation_info.seq, update_params.thumbnail)
      } catch (error) {
        log.error(this.log_prefix, '[updateTranscodingComplete ]', error)
      }
    }

    const operation_media_model = this.getOperationMediaModel(database)
    await operation_media_model.updateTransComplete(operation_info.seq, update_params)

    return {
      directory_info,
      media_info,
      smil_info,
    }
  }

  updateStreamUrl = async (database, operation_info, stream_url) => {
    const operation_media_model = this.getOperationMediaModel(database)
    await operation_media_model.updateStreamUrl(operation_info.seq, stream_url)
  }
}

const operation_media_service = new OperationMediaServiceClass()
export default operation_media_service
