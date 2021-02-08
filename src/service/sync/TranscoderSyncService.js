import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import SyncService from './SyncService'
import OperationService from '../operation/OperationService'
import OperationMediaService from '../operation/OperationMediaService'
import ServiceErrorModel from '../../database/mysql/service-error-model'

const TranscoderSyncServiceClass = class {
  constructor () {
    this.log_prefix = '[TranscoderSyncService]'
  }

  getOperationInfoByContentId = async (database, content_id) => {
    return await OperationService.getOperationInfoByContentId(database, content_id)
  }

  onTranscodingComplete = async (content_id, video_file_name, smil_file_name, request) => {
    if (Util.isEmpty(content_id) || Util.isEmpty(video_file_name) || Util.isEmpty(smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400)
    }
    const { operation_info } = await this.getOperationInfoByContentId(DBMySQL, content_id)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400)
    }

    try {
      await OperationMediaService.updateTranscodingComplete(DBMySQL, operation_info, video_file_name, smil_file_name)
      await SyncService.onAnalysisComplete(operation_info)
    } catch (error) {
      log.error(this.log_prefix, '[onTranscodingComplete]', error)
      let error_str = null
      if (error.toJSON) {
        error_str = JSON.stringify(error.toJSON())
      } else if (error.stack) {
        error_str = JSON.stringify(error.stack)
      } else if (error.message) {
        error_str = error.message
      } else {
        error_str = error.toString()
      }
      await this.onTranscodingError(content_id, error_str, request)
    }
  }

  onTranscodingError = async (content_id, message, request) => {
    if (Util.isEmpty(content_id)) {
      throw new StdObject(1, '잘못된 파라미터', 400)
    }

    const { operation_info } = await this.getOperationInfoByContentId(DBMySQL, content_id)
    const service_error_model = new ServiceErrorModel(DBMySQL)
    if (operation_info.isEmpty()) {
      await service_error_model.createServiceError('trans', null, content_id, message, request)
    } else {
      await OperationService.updateAnalysisStatus(DBMySQL, operation_info, 'E')
      await service_error_model.createServiceError('trans', operation_info.seq, content_id, message, request)
    }
  }
}

const transcoder_sync_service = new TranscoderSyncServiceClass()
export default transcoder_sync_service
