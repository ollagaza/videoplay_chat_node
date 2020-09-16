import ServiceConfig from '../../service/service-config'
import Util from '../../utils/baseutil'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationService from '../../service/operation/OperationService'
import CloudFileService from '../../service/cloud/CloudFileService'
import NaverObjectStorageService from '../../service/storage/naver-object-storage-service'
import ReferFileModel from '../../database/mysql/file/ReferFileModel'
import VideoFileModel from '../../database/mysql/file/VideoFileModel'
import FileInfo from '../../wrapper/file/FileInfo'

const OperationFileServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationFileService]'
    this.TYPE_VIDEO = 'video'
    this.TYPE_REFER = 'refer'
    this.TYPE_ALL = 'all'
  }

  getReferFileModel = (database = null) => {
    if (database) {
      return new ReferFileModel(database)
    }
    return new ReferFileModel(DBMySQL)
  }

  getVideoFileModel = (database = null) => {
    if (database) {
      return new VideoFileModel(database)
    }
    return new VideoFileModel(DBMySQL)
  }

  getFileList = async (database, operation_info, file_type = this.TYPE_REFER) => {
    let refer_file_list = null
    let video_file_list = null
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_REFER) {
      refer_file_list = await this.getReferFileList(database, operation_info)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_VIDEO) {
      video_file_list = await this.getVideoFileList(database, operation_info)
    }
    return {
      refer_file_list,
      video_file_list
    }
  }

  getReferFileList = async (database, operation_info, rtnFileinfo = true) => {
    const refer_file_model = this.getReferFileModel(database)
    const result_list = await refer_file_model.getReferFileList(operation_info.storage_seq)
    return rtnFileinfo ? this.getFileInfoList(result_list) : result_list
  }

  getVideoFileList = async (database, operation_info) => {
    const video_file_model = this.getVideoFileModel(database)
    const result_list = await video_file_model.getVideoFileList(operation_info.storage_seq)
    return this.getFileInfoList(result_list)
  }

  getFileInfoList = (result_list) => {
    const file_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        file_list.push(new FileInfo(result_list[i]).setUrl())
      }
    }
    return file_list
  }

  createReferFileInfo = async (database, operation_info, upload_file_info) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const refer_file_model = this.getReferFileModel(database)

    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, directory_info.media_refer)).toJSON()
    file_info.storage_seq = operation_info.storage_seq

    const file_name = upload_file_info.new_file_name
    let is_moved = false
    if (ServiceConfig.isVacs() === false) {
      try {
        await NaverObjectStorageService.moveFile(upload_file_info.path, directory_info.media_refer, file_name, ServiceConfig.get('naver_object_storage_bucket_name'))
        is_moved = true
      } catch (error) {
        log.error(this.log_prefix, '[createReferFileInfo]', 'NaverObjectStorageService.moveFile', error)
      }
    }
    file_info.is_moved = is_moved

    return await refer_file_model.createReferFile(file_info)
  }

  copyReferFileInfo = async (database, storage_seq, origin_content_id, content_id, refer_list) => {
    const replace_regex = new RegExp(origin_content_id, 'gi')
    const refer_file_model = this.getReferFileModel(database)

    for (let cnt = 0; cnt < refer_list.length; cnt++) {
      const refer_file = refer_list[cnt]

      delete refer_file.seq
      delete refer_file.url
      refer_file.storage_seq = storage_seq.new_storage_seq

      if (refer_file.file_path) {
        refer_file.file_path = refer_file.file_path.replace(replace_regex, content_id)
      }
      refer_file.is_moved = true
      await refer_file_model.createReferData(refer_file)
    }
  }

  createVideoFileInfo = async (database, operation_info, upload_file_info, create_thumbnail = false) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)

    let thumbnail_path = null
    if (create_thumbnail) {
      const thumbnail_info = await OperationService.createOperationVideoThumbnail(upload_file_info.path, operation_info)
      thumbnail_path = thumbnail_info.path
    }

    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, directory_info.media_origin)).toJSON()
    file_info.storage_seq = operation_info.storage_seq
    file_info.thumbnail = thumbnail_path

    const video_file_model = this.getVideoFileModel(database)
    return await video_file_model.createVideoFile(file_info)
  }

  deleteFileList = async (database, operation_info, file_seq_list, file_type = this.TYPE_REFER) => {
    let refer_delete_result = false
    let video_delete_result = false
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_REFER) {
      refer_delete_result = await this.deleteReferFileList(database, operation_info, file_seq_list)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_VIDEO) {
      video_delete_result = await this.deleteVideoFileList(database, operation_info, file_seq_list)
    }

    return {
      refer_delete_result,
      video_delete_result
    }
  }

  deleteReferFileList = async (database, operation_info, file_seq_list) => {
    const refer_file_model = this.getReferFileModel(database)
    const delete_file_list = await refer_file_model.deleteSelectedFiles(file_seq_list)
    if (!delete_file_list) {
      return false
    }
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_base_path = directory_info.media_refer;

    (async (file_base_path, delete_file_list) => {
      await this.deleteFiles(operation_info, delete_file_list)
    })(file_base_path, delete_file_list)

    return true
  }

  deleteVideoFileList = async (database, operation_info, file_seq_list) => {
    const video_file_model = this.getVideoFileList(database)
    const delete_file_list = await video_file_model.deleteSelectedFiles(file_seq_list)

    if (!delete_file_list) {
      return false
    }
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_base_path = directory_info.media_video;

    (async (file_base_path, delete_file_list) => {
      await this.deleteFiles(operation_info, delete_file_list)
    })(file_base_path, delete_file_list)

    return true
  }

  deleteFiles = async (file_base_path, file_info_list) => {
    if (!file_info_list) return
    const media_root = ServiceConfig.get('media_root')
    const cloud_file_list = []
    for (let i = 0; i < file_info_list.length; i++) {
      const file_info = file_info_list[i]
      const file_name = Util.getFileName(file_info.file_path)
      const target_path = media_root + file_info.file_path
      await Util.deleteFile(target_path)
      cloud_file_list.push(file_name)
    }
    if (ServiceConfig.isVacs() === false) {
      await CloudFileService.requestDeleteObjectFileList(file_base_path, cloud_file_list, false)
    }
  }
}

const operation_file_service = new OperationFileServiceClass()
export default operation_file_service
