import _ from 'lodash'
import querystring from 'querystring'
import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config'
import Role from '../../constants/roles'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import GroupService from '../group/GroupService'
import OperationFileService from './OperationFileService'
import OperationMediaService from './OperationMediaService'
import OperationDataService from './OperationDataService'
import CloudFileService from '../cloud/CloudFileService'
import VacsService from '../vacs/VacsService'
import OperationModel from '../../database/mysql/operation/OperationModel'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import OperationFolderService from './OperationFolderService'
import { VideoIndexInfoModel } from '../../database/mongodb/VideoIndex'
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata'
import { OperationClipModel } from '../../database/mongodb/OperationClip'
import { UserDataModel } from '../../database/mongodb/UserData'
import OperationInfo from '../../wrapper/operation/OperationInfo'
import OperationClipService from './OperationClipService'
import MongoDataService from '../common/MongoDataService'
import { OperationAnalysisModel } from '../../database/mongodb/OperationAnalysisModel'
import Zip from 'adm-zip'
import iconv from 'iconv-lite'
import NaverObjectStorageService from '../storage/naver-object-storage-service'
import GroupMemberModel from "../../database/mysql/group/GroupMemberModel";
import OperationCommentService from "./OperationCommentService";
import OperationDataModel from '../../database/mysql/operation/OperationDataModel'

const OperationServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationServiceClass]'
    this.MODE_OPERATION = 'operation'
    this.MODE_FILE = 'file'
  }

  getOperationModel = (database = null) => {
    if (database) {
      return new OperationModel(database)
    }
    return new OperationModel(DBMySQL)
  }

  getOperationStorageModel = (database = null) => {
    if (database) {
      return new OperationStorageModel(database)
    }
    return new OperationStorageModel(DBMySQL)
  }

  getGroupMemberModel = (database = null) => {
    if (database) {
      return new GroupMemberModel(database)
    }
    return new GroupMemberModel(DBMySQL)
  }

  createOperation = async (database, member_info, group_member_info, request_body, status = null) => {
    const output = new StdObject()
    let is_success = false

    const input_operation_data = new OperationInfo().getByRequestBody(request_body.operation_info)
    if (input_operation_data.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 없습니다.', 500)
    }
    const operation_info = input_operation_data.toJSON()
    const content_id = Util.getContentId()
    const group_media_path = group_member_info.media_path
    operation_info.group_seq = group_member_info.group_seq
    operation_info.member_seq = member_info.seq
    operation_info.media_path = `${group_media_path}/operation/${content_id}/`
    operation_info.created_by_user = 1
    operation_info.content_id = content_id
    if (status) {
      operation_info.status = status
    }

    const operation_model = new OperationModel(database)
    await operation_model.createOperation(operation_info)
    if (!operation_info || !operation_info.seq) {
      throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
    }
    const operation_seq = operation_info.seq
    output.add('operation_info', operation_info)

    await database.transaction(async (transaction) => {
      const operation_media_seq = await OperationMediaService.createOperationMediaInfo(database, operation_info)
      const operation_storage_seq = await this.getOperationStorageModel(transaction).createOperationStorageInfo(operation_info)

      output.add('operation_seq', operation_seq)
      output.add('operation_media_seq', operation_media_seq)
      output.add('operation_storage_seq', operation_storage_seq)

      is_success = true
    })

    if (is_success) {
      await this.createOperationDirectory(operation_info)

      try {
        await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info)
        await OperationMetadataModel.createOperationMetadata(operation_info, request_body.meta_data)
        if (operation_info.operation_type) {
          await UserDataModel.updateByMemberSeq(member_info.seq, { operation_type: operation_info.operation_type, operation_mode: operation_info.mode })
        }
      } catch (error) {
        log.error(this.log_prefix, '[createOperation]', 'create metadata error', error)
      }

      const created_operation_info = await operation_model.getOperationInfoNoJoin(operation_seq)
      const operation_data_seq = await OperationDataService.createOperationDataByRequest(created_operation_info, request_body, group_member_info.group_seq, group_member_info.group_name, group_member_info.group_type, member_info.hospname)
      output.add('operation_data_seq', operation_data_seq)

      if (ServiceConfig.isVacs()) {
        VacsService.increaseCount(1)
      }

      if (group_member_info) {
        const group_member_model = this.getGroupMemberModel(database)
        group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(group_member_info.group_seq, member_info.seq, 'vid', 'up');
      }
    }
    return output
  }

  copyOperation = (group_seq, member_info, request_body) => {
    (
      async () => {

        const operation_seq_list = request_body.copy_seq_list
        const copy_type = request_body.operation_copy_type ? request_body.operation_copy_type : null
        const folder_info = request_body.folder_info ? request_body.folder_info : null
        const change_group_seq = request_body.group_seq ? request_body.group_seq : group_seq

        const result_list = []
        const copy_result = {
          success: false,
          operation_seq_list,
          copy_type,
          folder_seq: folder_info ? folder_info.seq : null,
          group_seq: change_group_seq,
          result_list
        }
        log.debug(this.log_prefix, '[copyOperation]', 'copy_result', copy_result)
        let has_error = false

        for (let i = 0; i < operation_seq_list.length; i++) {
          const origin_operation_seq = operation_seq_list[i]
          const copy_result = await this.copyOperationOne(member_info, origin_operation_seq, change_group_seq, request_body)
          if (!copy_result.success) {
            has_error = true
          }
          result_list.push(copy_result)

          //TODO: 복사결과 socket 전송
        }
        if (has_error) {
          log.error(this.log_prefix, '[copyOperation]', 'fail', copy_result)
        } else {
          log.debug(this.log_prefix, '[copyOperation]', 'success', copy_result)
        }
      }
    )()
  }

  copyOperationOne = async (member_info, origin_operation_seq, group_seq, request_body) => {
    const copy_type = request_body.operation_copy_type ? request_body.operation_copy_type : null
    const modify_operation_info = request_body.operation_info ? request_body.operation_info : null
    const modify_operation_data = request_body.operation_data ? request_body.operation_data : null
    const folder_info = request_body.folder_info ? request_body.folder_info : null
    const mento_group_seq = request_body.mento_group_seq ? request_body.mento_group_seq : null
    const group_info = await GroupService.getGroupInfo(null, group_seq)

    let is_success = false
    const result = {
      success: false
    }
    result.origin_operation_seq = origin_operation_seq

    let directory = null
    let operation_seq = null
    const operation_model = new OperationModel(DBMySQL)

    try {
      const content_id = Util.getContentId()
      const group_media_path = group_info.media_path
      const origin_operation_info = await this.getOperationInfoNoJoin(DBMySQL, origin_operation_seq, false)
      log.debug(this.log_prefix, '[copyOperationOne]', 'origin_operation_info', origin_operation_seq, group_seq)
      const origin_content_id = origin_operation_info.content_id
      delete origin_operation_info.seq
      delete origin_operation_info.reg_date
      delete origin_operation_info.modify_date

      result.origin_operation_name = origin_operation_info.operation_name
      result.origin_operation_code = origin_operation_info.operation_code

      const operation_info = _.clone(origin_operation_info)
      operation_info.group_seq = group_seq
      if (!operation_info.origin_seq) {
        operation_info.origin_seq = origin_operation_seq
        operation_info.origin_media_path = origin_operation_info.media_path
        operation_info.origin_content_id = origin_content_id
      }
      operation_info.media_path = `${group_media_path}/operation/${content_id}/`
      operation_info.content_id = content_id
      operation_info.folder_seq = folder_info !== null ? folder_info.seq : null
      operation_info.status = 'C'

      if (!Util.isEmpty(modify_operation_info)) {
        operation_info.operation_code = modify_operation_info.operation_code
        operation_info.operation_date = modify_operation_info.operation_date
        operation_info.operation_name = modify_operation_info.operation_name
        operation_info.operation_type = modify_operation_info.operation_type
        operation_info.folder_seq = modify_operation_info.folder_seq
        operation_info.hour = modify_operation_info.hour
        operation_info.minute = modify_operation_info.minute
        operation_info.patient_age = modify_operation_info.patient_age
        operation_info.patient_sex = modify_operation_info.patient_sex
      }

      await operation_model.createOperation(operation_info)
      if (!operation_info || !operation_info.seq) {
        throw new StdObject(-1, '수술정보 복사에 실패하였습니다.', 500)
      }
      operation_seq = operation_info.seq
      operation_info.operation_seq = operation_info.seq
      const operation_media_seq = await OperationMediaService.copyOperationMediaInfo(DBMySQL, operation_info, origin_operation_seq)
      const operation_storage_info = await this.getOperationStorageModel(DBMySQL).copyOperationStorageInfo(operation_info, origin_operation_seq)
      const storage_seq = operation_storage_info.seq
      const origin_storage_seq = operation_storage_info.origin_storage_seq
      await OperationFolderService.OperationFolderStorageSize(DBMySQL, operation_info, 0, operation_storage_info.total_file_size);

      result.operation_seq = operation_seq
      result.operation_media_seq = operation_media_seq
      result.storage_seq = storage_seq

      const directory_info = this.getOperationDirectoryInfo(operation_info)
      directory = directory_info.root

      is_success = true

      if (is_success) {
        await this.createOperationDirectory(operation_info)

        const origin_operation_file_list = await OperationFileService.getOperationFileList(DBMySQL, origin_operation_seq, false)
        if (origin_operation_file_list && origin_operation_file_list.length) {
          await OperationFileService.copyOperationFileInfo(DBMySQL, operation_seq, origin_operation_file_list)
        }
        result.copy_operation_file_info = true

        const origin_refer_file_list = await OperationFileService.getReferFileList(DBMySQL, origin_storage_seq, false)
        if (origin_refer_file_list) {
          await OperationFileService.copyReferFileInfo(DBMySQL, storage_seq, origin_refer_file_list, operation_info)
        }
        result.copy_refer_file_info = true

        const video_index_info = await VideoIndexInfoModel.findOneByOperation(origin_operation_seq)
        let index_list = []
        if (video_index_info.index_list) {
          index_list = video_index_info.index_list
          for (let i = 0; i < index_list.length; i++) {
            if (index_list[i].thumbnail_url) {
              index_list[i].thumbnail_url = index_list[i].thumbnail_url.replace(operation_info.origin_media_path, operation_info.media_path)
            }
          }
        }
        await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_list)
        result.copy_video_index_info = true

        let operation_metadata = await OperationMetadataModel.findByOperationSeq(origin_operation_seq, '-_id -member_seq -content_id -operation_seq -created_date -modify_date -__v')
        if (operation_metadata) {
          operation_metadata = operation_metadata.toJSON()
          await OperationMetadataModel.createOperationMetadata(operation_info, operation_metadata)
        }
        result.copy_operation_metadata = true

        const copy_clip_result = await OperationClipService.copyClipByOperation(origin_operation_seq, operation_info)
        if (!copy_clip_result) {
          throw new StdObject(-2, '클립 복사에 실패하였습니다.')
        }
        result.copy_clip_list = true

        const { operation_data_seq, origin_data_seq } = await OperationDataService.copyOperationDataByRequest(operation_info, origin_operation_seq, copy_type, modify_operation_data, mento_group_seq)
        result.operation_data_seq = operation_data_seq
        result.copy_operation_data = true

        await OperationCommentService.copyComment(operation_data_seq, origin_data_seq, group_seq)

        const origin_directory_info = this.getOperationDirectoryInfo(origin_operation_info)

        let copy_result
        copy_result = await Util.copyDirectory(origin_directory_info.image, directory_info.image, false)
        if (copy_result.has_error) {
          throw new StdObject(-3, '이미지 복사에 실패하였습니다.', 500, copy_result)
        }
        result.copy_image_directory = true

        await Util.copyDirectory(origin_directory_info.refer, directory_info.refer)
        if (copy_result.has_error) {
          throw new StdObject(-4, '첨부파일 복사에 실패하였습니다.', 500, copy_result)
        }
        result.copy_refer_directory = true

        await Util.copyDirectory(origin_directory_info.temp, directory_info.temp)
        result.copy_temp_directory = true

        await Util.copyDirectory(origin_directory_info.other, directory_info.other)
        result.copy_other_directory = true

        await this.updateStatus(DBMySQL, [operation_seq], 'Y')

        if (ServiceConfig.isVacs()) {
          VacsService.increaseCount(1)
        }

        result.success = true
      }
    } catch (e) {
      log.error(this.log_prefix, '[copyOperationOne]', origin_operation_seq, e, result)
      if (operation_seq) {
        await operation_model.deleteOperation(operation_seq)
        await this.deleteMongoDBData(operation_seq)
      }
      if (directory) {
        await Util.deleteDirectory(directory)
      }
    }

    return result
  }

  deleteMongoDBData = async (operation_seq) => {
    try {
      await VideoIndexInfoModel.deleteByOperation(operation_seq)
    } catch (e1) {}
    try {
      await OperationMetadataModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
    try {
      await OperationClipModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
    try {
      OperationAnalysisModel.deleteByOperationSeq(operation_seq)
    } catch (e1) {}
  }

  updateOperation = async (member_seq, operation_info, request_body) => {
    const operation_seq = operation_info.seq
    const update_operation_info = new OperationInfo().getByRequestBody(request_body.operation_info)
    if (operation_info.isEmpty()) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }

    const output = new StdObject()
    await DBMySQL.transaction(async (transaction) => {
      const result = await this.getOperationModel(transaction).updateOperationInfo(operation_seq, update_operation_info)
      await OperationDataService.updateOperationDataByRequest(transaction, operation_seq, request_body)
      const metadata_result = await OperationMetadataModel.updateByOperationInfo(operation_info, update_operation_info.operation_type, request_body.meta_data)
      if (!metadata_result || !metadata_result._id) {
        throw new StdObject(-1, '수술정보 변경에 실패하였습니다.', 400)
      }
      output.add('result', result)
    })
    try {
      await UserDataModel.updateByMemberSeq(member_seq, { operation_type: update_operation_info.operation_type })
    } catch (error) {
      log.error(this.log_prefix, '[updateOperation]', 'update user_data error', error)
    }
    return output
  }

  deleteOperationByList = (group_seq, request_data) => {
    (
      async (group_seq, request_data) => {
        try {
          let operation_list = null
          let folder_operation_list = null
          if (request_data.operation_folder_list) {
            folder_operation_list = await OperationFolderService.deleteChildFolderAndRtnOperationList(DBMySQL, group_seq, request_data.operation_folder_list)
            operation_list = folder_operation_list.operation_data
          }
          if (request_data.operation_info_list) {
            if (operation_list) {
              operation_list = operation_list.concat(request_data.operation_info_list)
            } else {
              operation_list = request_data.operation_info_list
            }
          }

          if (operation_list && operation_list.length > 0) {
            for (let cnt = 0; cnt < operation_list.length; cnt++) {
              await OperationService.deleteOperationAndUpdateStorage(operation_list[cnt])
            }
          }
          if (folder_operation_list) {
            await OperationFolderService.deleteOperationFolders(DBMySQL, group_seq, folder_operation_list.allChildFolderList)
          }
        } catch (error) {
          log.error(this.log_prefix, '[deleteOperationBySeqList]', group_seq, request_data, error)
        }
      }
    )(group_seq, request_data)
  }

  deleteOperation = async (database, token_info, operation_seq) => {
    const operation_info = await this.getOperationInfo(database, operation_seq, token_info, true, false)
    await this.deleteOperationAndUpdateStorage(operation_info)
    return true
  }

  deleteOperationAndUpdateStorage = async (operation_info) => {
    const operation_model = this.getOperationModel()
    await operation_model.setOperationStatusDelete(operation_info.seq)
    await OperationDataService.changeStatus(operation_info.seq, 'D')
    await OperationFolderService.OperationFolderStorageSize(null, operation_info, operation_info.total_file_size, 0);
    await GroupService.updateMemberUsedStorage(null, operation_info.group_seq, operation_info.member_seq)

    await this.deleteMongoDBData(operation_info.seq)
    this.onOperationDeleteComplete(operation_info)
    return true
  }

  onOperationDeleteComplete = (operation_info) => {
    (
      async () => {
        try {
          let delete_link_file = false
          let delete_origin = false
          let has_copy = false
          const operation_model = this.getOperationModel()
          if (operation_info.origin_seq) {
            const has_origin = await operation_model.hasOrigin(operation_info.origin_seq)
            delete_origin = !has_origin
            delete_link_file = true
          } else {
            has_copy = await operation_model.hasCopy(operation_info.seq)
            delete_link_file = !has_copy
          }
          if (!has_copy) {
            await operation_model.deleteOperation(operation_info.seq)
          }

          await this.deleteOperationFiles(operation_info, delete_link_file, delete_origin)
          if (ServiceConfig.isVacs()) {
            VacsService.updateStorageInfo()
            VacsService.increaseCount(0, 1)
          }
        } catch (e) {
          log.error(this.log_prefix, '[onOperationDeleteComplete]', e)
        }
      }
    )()
  }

  deleteOperationFiles = async (operation_info, delete_link_file = true, delete_origin = false) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    if (delete_origin) {
      await Util.deleteDirectory(directory_info.root_origin)
    }
    if (ServiceConfig.isVacs() === false) {
      await Util.deleteDirectory(directory_info.root)
      if (delete_link_file) {
        await CloudFileService.requestDeleteObjectFile(directory_info.media_path, true)
      }
      if (delete_origin) {
        await CloudFileService.requestDeleteObjectFile(directory_info.media_path_origin, true)
      }
    } else {
      if (delete_link_file) {
        await Util.deleteDirectory(directory_info.root)
      } else {
        await Util.deleteDirectory(directory_info.image)
        await Util.deleteDirectory(directory_info.refer)
        await Util.deleteDirectory(directory_info.temp)
        await Util.deleteDirectory(directory_info.other)
        await Util.deleteDirectory(directory_info.origin)
        if (!ServiceConfig.isVacs()) {
          await Util.deleteDirectory(directory_info.file)
        }
      }
    }
  }

  getOperationListByRequest = async (database, token_info, request) => {
    const request_query = request.query ? request.query : {}
    const page_params = {}
    page_params.page = request_query.page
    page_params.list_count = request_query.list_count
    page_params.page_count = request_query.page_count
    page_params.no_paging = request_query.no_paging

    const filter_params = {}
    filter_params.analysis_complete = request_query.analysis_complete
    filter_params.status = request_query.status
    filter_params.menu = request_query.menu
    filter_params.member_seq = request_query.member_seq ? request_query.member_seq : null
    if (request_query.folder_seq) {
      filter_params.folder_seq = request_query.folder_seq
    }
    if (request_query.search_keyword) {
      filter_params.search_keyword = request_query.search_keyword;
    }
    if (request_query.member_grade) {
      filter_params.member_grade = request_query.member_grade;
    }

    log.debug(this.log_prefix, '[getOperationListByRequest]', 'request.query', request_query, page_params, filter_params)

    return await this.getOperationList(database, token_info.getGroupSeq(), page_params, filter_params)
  }

  getOperationList = async (database, group_seq, page_params = {}, filter_params = {}) => {
    page_params.no_paging = page_params.no_paging ? page_params.no_paging : 'n'
    log.debug(this.log_prefix, '[getOperationList]', page_params, filter_params)
    const operation_model = this.getOperationModel(database)
    if (filter_params.search_keyword) {
      return await operation_model.getOperationInfoSearchListPage(group_seq, page_params, filter_params)
    } else {
      return await operation_model.getOperationInfoListPage(group_seq, page_params, filter_params)
    }
  }

  setMediaInfo = async (database, operation_info) => {
    const media_info = await OperationMediaService.getOperationMediaInfo(database, operation_info)
    operation_info.setMediaInfo(media_info)
  }

  getOperationInfoNoAuth = async (database, operation_seq, import_media_info = true) => {
    const operation_model = this.getOperationModel(database)
    const operation_info = await operation_model.getOperationInfo(operation_seq, import_media_info)
    return { operation_info, operation_model }
  }

  getOperationInfoNoJoin = async (database, operation_seq, wrap_result = true) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getOperationInfoNoJoin(operation_seq, wrap_result)
  }

  getOperationInfo = async (database, operation_seq, token_info, check_owner = true, import_media_info = false) => {
    const { operation_info } = await this.getOperationInfoNoAuth(database, operation_seq, false)

    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 존재하지 않습니다.', 400)
    }
    if (check_owner) {
      if (!token_info) {
        throw new StdObject(-98, '권한이 없습니다.', 403)
      }
      if (operation_info.member_seq !== token_info.getId()) {
        if (token_info.getRole() !== Role.ADMIN) {
          if (operation_info.group_seq !== token_info.getGroupSeq()) {
            throw new StdObject(-99, '권한이 없습니다.', 403)
          }
        }
      }
    }

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return operation_info
  }

  getOperationInfoByContentId = async (database, content_id, import_media_info = false) => {
    const operation_model = this.getOperationModel(database)
    const operation_info = await operation_model.getOperationInfoByContentId(content_id)

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return { operation_info, operation_model }
  }

  createOperationDirectory = async (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)

    await Util.createDirectory(directory_info.video)
    await Util.createDirectory(directory_info.other)
    await Util.createDirectory(directory_info.refer)
    await Util.createDirectory(directory_info.image)
    await Util.createDirectory(directory_info.temp)
    await Util.createDirectory(directory_info.file)
  }

  getGroupTotalStorageUsedSize = async (database, group_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupTotalStorageUsedSize(group_seq)
  }

  getGroupMemberStorageUsedSize = async (database, group_seq, member_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupMemberStorageUsedSize(group_seq, member_seq)
  }

  getVideoIndexList = async (operation_seq) => {
    const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq)
    return video_index_info.index_list ? video_index_info.index_list : []
  }

  uploadOperationFile = async (database, request, response, operation_info, file_type, field_name = null) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    let media_directory
    if (file_type === OperationFileService.TYPE_REFER) {
      media_directory = directory_info.refer
    } else if (file_type === OperationFileService.TYPE_FILE) {
      media_directory = directory_info.file
    } else {
      media_directory = directory_info.origin
    }

    if (!(await Util.fileExists(media_directory))) {
      await Util.createDirectory(media_directory)
    }

    const file_field_name = field_name ? field_name : 'target'
    if (file_type === OperationFileService.TYPE_REFER) {
      await Util.uploadByRequest(request, response, file_field_name, media_directory, Util.getRandomId())
    } else if (file_type === OperationFileService.TYPE_FILE) {
      await Util.uploadByRequest(request, response, file_field_name, media_directory, Util.getRandomId())
    } else {
      await Util.uploadByRequest(request, response, file_field_name, media_directory)
    }
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    upload_file_info.new_file_name = request.new_file_name
    log.debug(this.log_prefix, '[uploadOperationFile]', 'request.body', request.body)

    return await this.createOperationFileInfo(file_type, operation_info, upload_file_info, request.body)
  }

  createOperationFileInfo = async (file_type, operation_info, upload_file_info, request_body) => {
    let upload_seq = null
    if (file_type === OperationFileService.TYPE_REFER) {
      upload_seq = await OperationFileService.createReferFileInfo(null, operation_info, upload_file_info)
    } else if (file_type === OperationFileService.TYPE_FILE) {
      upload_seq = await OperationFileService.createOperationFileInfo(null, operation_info, upload_file_info, request_body)
    } else {
      upload_seq = await OperationFileService.createVideoFileInfo(null, operation_info, upload_file_info, false)
    }
    // if (!upload_seq) {
    //   throw new StdObject(-1, '파일 정보를 저장하지 못했습니다.', 500)
    // }
    return upload_seq
  }

  uploadOperationFileByZip = (operation_info, temp_directory, zip_file_path, encoding, file_type) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const operation_seq = operation_info.seq
    const storage_seq = operation_info.storage_seq

    let zip = null
    try {
      zip = new Zip(zip_file_path)
    } catch (e) {
      log.error(this.log_prefix, '[uploadOperationFileByZip] - unable open zip file', operation_seq, e);
      (
        async () => {
          await Util.deleteDirectory(temp_directory)
        }
      )()
      return
    }

    (
      async (zip_entries) => {
        for (let i = 0; i < zip_entries.length; i++) {
          const zip_entry = zip_entries[i]
          if (zip_entry.isDirectory) continue
          const entry_header = zip_entry.header
          const size = entry_header.size
          const entry_name = iconv.decode(zip_entry.rawEntryName, encoding);
          const file_name = entry_name.split("/").pop()
          log.debug(this.log_prefix, '[uploadOperationFileByZip]', operation_seq, entry_name, file_name, size);

          const upload_file_name = Util.getRandomId()
          const upload_file_path = directory_info.refer + upload_file_name
          const upload_result = await Util.writeFile(upload_file_path, zip_entry.getData(), false)
          if (!upload_result) {
            log.error(this.log_prefix, '[uploadOperationFileByZip] unable write file', operation_seq, entry_name, upload_file_path)
            return;
          }
          const upload_file_info = {
            originalname: file_name,
            new_file_name: upload_file_name,
            path: upload_file_path,
            size
          }
          try {
            await this.createOperationFileInfo(file_type, operation_info, upload_file_info, storage_seq)
          } catch (e) {
            log.error(this.log_prefix, '[uploadOperationFileByZip]', operation_seq, e)
          }
        }

        await Util.deleteDirectory(temp_directory)
      }
    )(zip.getEntries())
  }

  onUploadComplete = async (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    if (operation_info.mode === 'file') {
      if (!ServiceConfig.isVacs()) {
        await NaverObjectStorageService.moveFolder(directory_info.file, directory_info.media_file)
      }
    }
    await this.updateStorageSize(operation_info)
  }

  updateStorageSize = async (operation_info) => {
    const storage_size = await new OperationStorageModel(DBMySQL).updateUploadFileSize(operation_info, OperationFileService.TYPE_ALL)
    await GroupService.updateMemberUsedStorage(null, operation_info.group_seq, operation_info.member_seq)
    await OperationFolderService.OperationFolderStorageSize(null, operation_info, operation_info.total_file_size, storage_size);
    if (ServiceConfig.isVacs()) {
      VacsService.updateStorageInfo()
    }
  }

  deleteFileInfo = async (operation_info, file_type, request_body) => {
    if (file_type === OperationFileService.TYPE_VIDEO) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }

    if (file_type === OperationFileService.TYPE_FILE) {
      await OperationFileService.deleteOperationFileList(DBMySQL, operation_info, request_body)
      return
    }

    const file_seq_list = request_body.file_seq_list
    if (!file_seq_list || file_seq_list.length <= 0) {
      throw new StdObject(-2, '잘못된 요청입니다.', 400)
    }

    if (file_type === OperationFileService.TYPE_REFER) {
      await OperationFileService.deleteReferFileList(DBMySQL, operation_info, file_seq_list)
    } else {
      return
    }
    await this.updateStorageSize(operation_info)
  }

  createOperationVideoThumbnail = async (origin_video_path, operation_info, second = 0) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const dimension = await Util.getVideoDimension(origin_video_path)
    if (!dimension.error && dimension.width && dimension.height) {
      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212)
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160)
      const file_id = Util.getRandomId()
      const thumbnail_file_name = `thumb_${file_id}.png`
      const thumbnail_image_path = `${directory_info.image}${thumbnail_file_name}`

      const get_thumbnail_result = await Util.getThumbnail(origin_video_path, thumbnail_image_path, second, thumb_width, thumb_height)
      if (get_thumbnail_result.success && (await Util.fileExists(thumbnail_image_path))) {
        return {
          file_id: file_id,
          file_name: thumbnail_file_name,
          full: thumbnail_image_path,
          path: `${directory_info.media_image}${thumbnail_file_name}`
        }
      } else {
        log.error(this.log_prefix, '[updateTranscodingComplete]', '[Util.getThumbnail]', get_thumbnail_result)
      }
    }
    return null
  }

  requestAnalysis = async (database, token_info, operation_seq, check_owner = true) => {
    const operation_info = await this.getOperationInfo(database, operation_seq, token_info, check_owner)
    if (operation_info.mode === this.MODE_FILE) {
      return await this.moveOperationFiles(operation_info)
    } else {
      return await this.requestTranscoder(operation_info)
    }
  }

  moveOperationFiles = async (operation_info) => {
    await this.updateAnalysisStatus(null, operation_info, 'Y')
  }

  requestTranscoder = async (operation_info) => {
    const operation_seq = operation_info.seq
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    let api_request_result = null
    let is_execute_success = false

    const operation_model = this.getOperationModel(DBMySQL)
    const operation_update_param = {}
    operation_update_param.analysis_status = 'R'

    const content_id = operation_info.content_id
    const query_data = {
      'DirPath': directory_info.trans_origin,
      'ContentID': content_id
    }
    const query_str = querystring.stringify(query_data)

    const request_options = {
      hostname: ServiceConfig.get('trans_server_domain'),
      port: ServiceConfig.get('trans_server_port'),
      path: ServiceConfig.get('trans_start_api') + '?' + query_str,
      method: 'GET'
    }
    const api_url = 'http://' + ServiceConfig.get('trans_server_domain') + ':' + ServiceConfig.get('trans_server_port') + ServiceConfig.get('trans_start_api') + '?' + query_str
    log.debug(this.log_prefix, '[requestTranscoder]', 'trans api url', api_url)
    try {
      api_request_result = await Util.httpRequest(request_options, false)
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done'
    } catch (error) {
      log.error(this.log_prefix, '[requestTranscoder]', 'trans api url', api_url, error)
    }

    if (is_execute_success) {
      await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param))
    } else {
      throw new StdObject(-1, '비디오 분석 요청 실패', 500)
    }
  }

  isDuplicateOperationCode = async (database, group_seq, member_seq, operation_code) => {
    const operation_model = this.getOperationModel(database)
    return operation_model.isDuplicateOperationCode(group_seq, member_seq, operation_code)
  }

  updateLinkState = async (database, operation_seq, has_link) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateLinkState(operation_seq, has_link)
  }

  updateAnalysisStatus = async (database, operation_info, status) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateAnalysisStatus(operation_info.seq, status)
    if (status === 'Y') {
      try {
        await OperationDataService.onUpdateComplete(operation_info.seq)
      } catch (error) {
        log.error(this.log_prefix, '[updateAnalysisStatus] - OperationDataService.onUpdateComplete', operation_info.seq, error)
      }
      if (ServiceConfig.isVacs()) {
        VacsService.updateStorageInfo()
      }
    }
  }

  getVideoDownloadURL = (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const has_origin = operation_info.origin_seq
    let video_path = directory_info.cdn_video
    if (ServiceConfig.isVacs()) {
      if (has_origin) {
        video_path = directory_info.url_video_origin
      } else {
        video_path = directory_info.url_video
      }
      return video_path + operation_info.media_info.video_file_name
    }
    if (has_origin) {
      video_path = directory_info.cdn_video_origin
    }
    return video_path + operation_info.media_info.video_file_name
  }

  getOperationMode = async (operation_seq) => {
    const operation_model = this.getOperationModel()
    return operation_model.getOperationMode(operation_seq)
  }

  getOperationDataView = async (operation_seq, group_seq) => {
    const options = {
      index_list: true,
      clip_list: true,
      writer_info: true,
      refer_file_list: true,
      import_media_info: true,
    }
    return this.getOperationDataInfo(operation_seq, group_seq, options)
  }

  getOperationDataViewFile = async (operation_seq, group_seq) => {
    const options = {
      operation_file_list: false,
      index_list: false,
      clip_list: true,
      writer_info: true,
      refer_file_list: true,
      import_media_info: false,
    }
    return this.getOperationDataInfo(operation_seq, group_seq, options)
  }

  getOperationDataInfo = async (operation_seq, group_seq, options = null) => {
    const { operation_info } = await this.getOperationInfoNoAuth(DBMySQL, operation_seq, options ? options.import_media_info : false)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(-1, '등록된 수술이 없습니다.', 400)
    }
    let operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
    if (!operation_data_info || operation_data_info.isEmpty()) {
      const operation_data_seq = await OperationDataService.createOperationDataByOperationSeq(operation_seq)
      if (operation_data_seq) {
        operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_data_seq)
      }
    }
    operation_data_info.setUrl()

    const output = new StdObject()
    output.add('operation_info', operation_info)
    output.add('operation_data_info', operation_data_info)
    output.add('is_writer', operation_info.group_seq === group_seq)

    if (options) {
      log.debug(this.log_prefix, '[getOperationDataInfo]', 'options', options)
      if (options.operation_file_list) {
        const { operation_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info, OperationFileService.TYPE_FILE)
        output.add('operation_file_list', operation_file_list)
      }

      if (options.index_list) {
        const index_list = await this.getVideoIndexList(operation_seq)
        output.add('index_list', index_list)
      }

      if (options.clip_list) {
        const clip_list = await OperationClipService.findByOperationSeq(operation_seq)
        output.add('clip_list', clip_list)
      }

      if (options.writer_info) {
        const writer_info = await GroupService.getGroupInfoWithGroupCounts(DBMySQL, operation_info.group_seq)
        output.add('writer_info', writer_info)
      }

      if (options.refer_file_list) {
        const { refer_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info, OperationFileService.TYPE_REFER)
        output.add('refer_file_list', refer_file_list)
      }

      if (options.operation_metadata) {
        const operation_metadata = await OperationMetadataModel.findByOperationSeq(operation_seq)
        output.add('operation_metadata', operation_metadata)
      }

      if (options.medical_info) {
        const medical_info = await MongoDataService.getMedicalInfo()
        output.add('medical_info', medical_info)
      }
    }

    return output
  }

  getOperationByFolderSeq = async (database, group_seq, folder_seq) => {
    const model = this.getOperationModel(database)
    return await model.getOperationByFolderSeq(group_seq, folder_seq)
  }

  updateStatusFavorite = async (database, operation_seq, is_delete) => {
    const model = this.getOperationModel(database)
    return await model.updateStatusFavorite(operation_seq, is_delete)
  }

  updateStatusTrash = async (database, seq_list, member_seq, is_delete = false) => {
    const model = this.getOperationModel(database)
    const status = is_delete ? 'Y' : 'T'
    await model.updateStatusTrash(seq_list, status)
    await OperationDataService.updateOperationDataByOperationSeqList(seq_list, status)

    for (let cnt = 0; cnt < seq_list.length; cnt++) {
      const where = { 'operation.seq': seq_list[cnt] }
      const operation_info = await model.getOperation(where);

      const group_member_model = this.getGroupMemberModel(database);

      if (status === 'T') {
        group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(operation_info.group_seq, operation_info.member_seq, 'vid', 'down');
      } else if (status === 'Y') {
        group_member_model.setUpdateGroupMemberCountsWithGroupSeqMemberSeq(operation_info.group_seq, operation_info.member_seq, 'vid', 'up');
      }

      if (operation_info.folder_seq !== null) {
        if (is_delete) {
          await OperationFolderService.OperationFolderStorageSize(DBMySQL, operation_info, 0, operation_info.total_file_size);
        } else {
          await OperationFolderService.OperationFolderStorageSize(DBMySQL, operation_info, operation_info.total_file_size, 0);
        }
      }
    }

    return true
  }

  updateStatus = async (database, seq_list, status) => {
    const model = this.getOperationModel(database)
    await model.updateStatus(seq_list, status)
    await OperationDataService.updateOperationDataByOperationSeqList(seq_list, status)

    return true
  }

  moveOperationFolder = async (database, operation_seq_list, folder_info) => {
    try {
      const model = this.getOperationModel(database)

      for (let cnt = 0; cnt < operation_seq_list.length; cnt++) {
        const where = { 'operation.seq': operation_seq_list[cnt] }
        const operation_info = await model.getOperation(where);
        if (operation_info.folder_seq !== null) {
          await OperationFolderService.OperationFolderStorageSize(DBMySQL, operation_info, operation_info.total_file_size, 0);
        }
        if (folder_info) {
          operation_info.folder_seq = folder_info.seq;
          await OperationFolderService.OperationFolderStorageSize(DBMySQL, operation_info, 0, operation_info.total_file_size);
        }
      }

      await model.moveOperationFolder(operation_seq_list, folder_info ? folder_info.seq : null)
    } catch (e) {
      throw e
    }
  }

  getAllChildFolderInOperationDatas = async (database, group_seq, folder_seq) => {
    const model = this.getOperationModel(database)
    const operation_infos = await model.getAllChildFolderInOperationDatas(group_seq, folder_seq)

    for (let cnt = 0; cnt < operation_infos.length; cnt++) {
      operation_infos[cnt] = new OperationInfo(operation_infos[cnt], null);
    }

    return operation_infos
  }

  getOperationDirectoryInfo = (operation_info) => {
    const media_path = operation_info.media_path
    const origin_media_path = operation_info.origin_media_path
    const media_directory = ServiceConfig.get('media_root') + media_path
    const url_prefix = ServiceConfig.get('static_storage_prefix') + media_path
    const cdn_url = ServiceConfig.get('static_cloud_prefix') + media_path
    const origin_media_directory = ServiceConfig.get('media_root') + origin_media_path
    const origin_url_prefix = ServiceConfig.get('static_storage_prefix') + origin_media_path
    const origin_cdn_url = ServiceConfig.get('static_cloud_prefix') + origin_media_path
    const content_path = operation_info.content_id + '/'
    const origin_content_path = operation_info.origin_content_id + '/'
    const trans_server_root = ServiceConfig.get('trans_server_root')
    const storage_server_root = ServiceConfig.get('storage_server_root')

    return {
      'root': media_directory,
      'root_origin': origin_media_directory,
      'origin': media_directory + 'origin/',
      'video': media_directory + 'video/',
      'video_origin': origin_media_directory + 'video/',
      'other': media_directory + 'other/',
      'refer': media_directory + 'refer/',
      'image': media_directory + 'image/',
      'temp': media_directory + 'temp/',
      'file': media_directory + 'file/',
      'media_path': media_path,
      'media_path_origin': origin_media_path,
      'media_origin': media_path + 'origin/',
      'media_video': media_path + 'video/',
      'media_video_origin': origin_media_path + 'video/',
      'media_other': media_path + 'other/',
      'media_refer': media_path + 'refer/',
      'media_image': media_path + 'image/',
      'media_temp': media_path + 'temp/',
      'media_file': media_path + 'file/',
      'trans_origin': trans_server_root + media_path + 'origin/',
      'trans_video': trans_server_root + media_path + 'video/',
      'storage_path': storage_server_root + media_path,
      'storage_origin': storage_server_root + media_path + 'origin/',
      'storage_video': storage_server_root + media_path + 'video/',
      'storage_file': storage_server_root + media_path + 'file/',
      'url_prefix': url_prefix,
      'url_origin': url_prefix + 'origin/',
      'url_video': url_prefix + 'video/',
      'url_video_origin': origin_url_prefix + 'video/',
      'url_other': url_prefix + 'other/',
      'url_refer': url_prefix + 'refer/',
      'url_image': url_prefix + 'image/',
      'url_temp': url_prefix + 'temp/',
      'url_file': url_prefix + 'file/',
      'cdn_prefix': cdn_url,
      'cdn_video': cdn_url + 'video/',
      'cdn_video_origin': origin_cdn_url + 'video/',
      'cdn_other': cdn_url + 'other/',
      'cdn_refer': cdn_url + 'refer/',
      'cdn_image': cdn_url + 'image/',
      'cdn_file': cdn_url + 'file/',
      'content_path': content_path,
      'content_origin': content_path + 'origin/',
      'content_video': content_path + 'video/',
      'content_video_origin': origin_content_path + 'video/',
      'content_other': content_path + 'other/',
      'content_refer': content_path + 'refer/',
      'content_image': content_path + 'image/',
      'content_temp': content_path + 'temp/',
      'content_file': content_path + 'file/',
    }
  }

  getAllOperationGroupMemberList = async (database, group_seq, member_seq) => {
    const model = this.getOperationModel(database)
    return await model.getGroupMemberOperationList(group_seq, member_seq);
  }

  setAllOperationClipDeleteByGroupSeqAndMemberSeq = async (databases, group_seq, member_seq) => {
    const clip_list = await OperationClipService.findByMemberSeqAndGroupSeq(member_seq, group_seq);
    let counting_clip = {};
    for (let i = 0; i < clip_list.length; i++) {
      const operation_seq = Number(clip_list[i].operation_seq);
      if (!counting_clip[operation_seq]) {
        counting_clip[operation_seq] = 1;
      } else {
        counting_clip[operation_seq]++;
      }
      const clip_id = clip_list[i]._id.toString();
      await OperationCommentService.deleteClipInfo(clip_id);
      await OperationClipModel.deleteById(clip_id);
    }
    const operation_storage_model = this.getOperationStorageModel(databases);
    const operation_seq_list = Object.keys(counting_clip);
    for (let i = 0; i < operation_seq_list.length; i++) {
      const operation_seq = operation_seq_list[i];
      const del_count = counting_clip[operation_seq];
      const operation_storage_info = await operation_storage_model.getOperationStorageInfo({ seq: operation_seq });
      let update_clip_count = operation_storage_info.clip_count - del_count;
      if (update_clip_count <= 0) {
        update_clip_count = 0;
      }
      await OperationClipService.updateClipCount({ seq: operation_storage_info.seq }, update_clip_count);
    }
  }
}

const OperationService = new OperationServiceClass()

export default OperationService
