import _ from "lodash"
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from "../../libs/logger"
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'
import OperationDataInfo from '../../wrapper/operation/OperationDataInfo'
import GroupService from '../member/GroupService'
import DBMySQL from '../../database/knex-mysql'
import OperationService from './OperationService'
import striptags from 'striptags'
import OperationFileService from './OperationFileService'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import ServiceConfig from '../service-config'

const OperationDataServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationDataService]'
    this.TYPE_COMMUNITY = 'C'
    this.TYPE_MENTORING = 'M'
  }

  getOperationDataModel = (database = null) => {
    if (database) {
      return new OperationDataModel(database)
    }
    return new OperationDataModel(DBMySQL)
  }

  createOperationDataByRequest = async (member_info, group_member_info, operation_seq, request_body) => {
    const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq)
    if (!operation_info) {
      return null
    }
    const operation_data_info = new OperationDataInfo(request_body.operation_data).toJSON()
    operation_data_info.operation_seq = operation_seq
    operation_data_info.group_seq = group_member_info.group_seq
    operation_data_info.group_name = group_member_info.group_name
    if (group_member_info.group_type === GroupService.GROUP_TYPE_PERSONAL) {
      operation_data_info.hospital = member_info.hospname
    }
    operation_data_info.title = operation_info.operation_name
    operation_data_info.status = operation_info.status
    operation_data_info.is_complete = operation_info.analysis_status === 'Y'
    operation_data_info.doc_text = striptags(operation_data_info.doc_html)

    const operation_data_model = this.getOperationDataModel()
    const operation_data_seq = await operation_data_model.createOperationData(operation_data_info)

    return operation_data_seq
  }

  setThumbnailImage = async (operation_seq, request, response) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_seq)
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_directory = directory_info.image
    if ( !( await Util.fileExists(media_directory) ) ) {
      await Util.createDirectory(media_directory)
    }
    const thumbnail_file_name = operation_info.content_id
    await Util.uploadByRequest(request, response, 'thumbnail', media_directory, thumbnail_file_name)

    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }

    const thumbnail_path = directory_info.media_image + thumbnail_file_name
    return await operation_data_model.updateThumbnailImage(operation_data.seq, thumbnail_path)
  }

  setThumbnailAuto = async (operation_seq, thumbnail_path) => {
    const operation_data_model = this.getOperationDataModel()
    const operation_data = await operation_data_model.getOperationDataByOperationSeq(operation_seq)
    if (!operation_data || operation_data.isEmpty()) {
      return null
    }
    await operation_data_model.updateThumbnailImage(operation_data.seq, thumbnail_path)
  }
}

const operation_data_service = new OperationDataServiceClass()
export default operation_data_service
