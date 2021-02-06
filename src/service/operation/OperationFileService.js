import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import OperationService from '../../service/operation/OperationService'
import CloudFileService from '../../service/cloud/CloudFileService'
import ReferFileModel from '../../database/mysql/file/ReferFileModel'
import VideoFileModel from '../../database/mysql/file/VideoFileModel'
import OperationFileModel from '../../database/mysql/operation/OperationFileModel'
import FileInfo from '../../wrapper/file/FileInfo'
import OperationFileInfo from '../../wrapper/operation/OperationFileInfo'
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'

const OperationFileServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationFileService]'
    this.TYPE_VIDEO = 'video'
    this.TYPE_REFER = 'refer'
    this.TYPE_FILE = 'file'
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

  getOperationFileModel = (database = null) => {
    if (database) {
      return new OperationFileModel(database)
    }
    return new OperationFileModel(DBMySQL)
  }

  getFileList = async (database, operation_info, file_type = this.TYPE_REFER) => {
    const result = {}
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_REFER) {
      result.refer_file_list = await this.getReferFileList(database, operation_info.storage_seq)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_VIDEO) {
      result.video_file_list = await this.getVideoFileList(database, operation_info.storage_seq)
    }
    if (file_type === this.TYPE_ALL || file_type === this.TYPE_FILE) {
      result.operation_file_list = await this.getOperationFileList(database, operation_info.seq)
    }
    return result;
  }

  getReferFileList = async (database, storage_seq, wrap_result = true) => {
    const refer_file_model = this.getReferFileModel(database)
    const result_list = await refer_file_model.getReferFileList(storage_seq)
    return wrap_result ? this.getFileInfoList(result_list) : result_list
  }

  getVideoFileList = async (database, storage_seq) => {
    const video_file_model = this.getVideoFileModel(database)
    const result_list = await video_file_model.getVideoFileList(storage_seq)
    return this.getFileInfoList(result_list)
  }

  getOperationFileList = async (database, operation_seq, wrap_result = true) => {
    const operation_file_model = this.getOperationFileModel(database)
    const result_list = await operation_file_model.getOperationFileList(operation_seq)
    if (!wrap_result) {
      return result_list
    }
    const file_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        file_list.push(new OperationFileInfo(result_list[i]).setUrl())
      }
    }
    return file_list
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
    file_info.is_moved = false

    return await refer_file_model.createReferFile(file_info)
  }

  copyReferFileInfo = async (database, storage_seq, refer_list, operation_info) => {
    const refer_file_model = this.getReferFileModel(database)

    for (let cnt = 0; cnt < refer_list.length; cnt++) {
      const refer_file = refer_list[cnt]

      delete refer_file.seq
      delete refer_file.url
      refer_file.storage_seq = storage_seq

      if (refer_file.file_path) {
        refer_file.file_path = refer_file.file_path.replace(operation_info.origin_media_path, operation_info.media_path)
      }
      await refer_file_model.createReferData(refer_file)
    }
  }

  copyOperationFileInfo = async (database, operation_seq, operation_file_list) => {
    const operation_file_model = this.getOperationFileModel(database)

    for (let cnt = 0; cnt < operation_file_list.length; cnt++) {
      const operation_file = operation_file_list[cnt]

      delete operation_file.seq
      delete operation_file.reg_date
      operation_file.operation_seq = operation_seq
      await operation_file_model.createOperationFile(operation_file)
    }
  }

  createVideoFileInfo = async (database, operation_info, upload_file_info, create_thumbnail = false) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const media_info = await Util.getMediaInfo(upload_file_info.path)
    if (media_info.media_type !== Constants.VIDEO) {
      throw new StdObject(1000, '동영상 파일만 업로드 가능합니다.', 400, media_info)
    }

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

  createOperationFileInfo = async (database, operation_info, upload_file_info, request_body) => {
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_info = new OperationFileInfo().getByUploadFileInfo(operation_info.seq, upload_file_info, request_body.directory, directory_info.media_file).toJSON()
    if (!file_info.file_name) {
      throw new StdObject(-1, '파일을 업로드에 실패하였습니다.', 400, file_info)
    }
    const media_info = await Util.getMediaInfo(upload_file_info.path)
    if (!media_info || !media_info.media_info.width || !media_info.media_info.height) return false
    if (media_info.media_type === Constants.VIDEO || media_info.media_type === Constants.IMAGE) {
      file_info.width = media_info.media_info.width
      file_info.height = media_info.media_info.height

      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212)
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160)
      const thumbnail_image_path = `${upload_file_info.path}_thumb.jpg`
      const get_thumbnail_result = await Util.getThumbnail(upload_file_info.path, thumbnail_image_path, -1, thumb_width, thumb_height)

      if (get_thumbnail_result.success && (await Util.fileExists(thumbnail_image_path))) {
        file_info.thumbnail_path = directory_info.media_file + `${upload_file_info.new_file_name}_thumb.jpg`
      }
      file_info.file_type = media_info.media_type
    } else {
      file_info.file_type = Util.getMimeType(upload_file_info.path, file_info.file_name)
    }

    const operation_file_model = this.getOperationFileModel(database)
    return await operation_file_model.createOperationFile(file_info)
  }

  deleteFileList = async (database, operation_info, file_seq_list, file_type = this.TYPE_REFER) => {
    let refer_delete_result = false
    let video_delete_result = false
    if (file_type === this.TYPE_REFER) {
      refer_delete_result = await this.deleteReferFileList(database, operation_info, file_seq_list)
    }
    if (file_type === this.TYPE_VIDEO) {
      video_delete_result = await this.deleteVideoFileList(database, operation_info, file_seq_list)
    }
    if (file_type === this.TYPE_FILE) {
      video_delete_result = await this.deleteOperationFileList(database, operation_info, file_seq_list)
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
    this.deleteFiles(file_base_path, delete_file_list)

    return true
  }

  deleteVideoFileList = async (database, operation_info, file_seq_list) => {
    const video_file_model = this.getVideoFileModel(database)
    const delete_file_list = await video_file_model.deleteSelectedFiles(file_seq_list)

    if (!delete_file_list) {
      return false
    }
    const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    const file_base_path = directory_info.media_video;
    this.deleteFiles(file_base_path, delete_file_list)

    return true
  }

  deleteOperationFileList = async (database, operation_info, file_seq_list) => {
    const operation_file_model = this.getOperationFileModel(database)
    const delete_file_list = await operation_file_model.deleteSelectedFiles(file_seq_list)

    if (!delete_file_list) {
      return false
    }
    // const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
    // const file_base_path = directory_info.media_video
    // this.deleteFiles(file_base_path, delete_file_list)

    return true
  }

  deleteFiles = (file_base_path, file_info_list) => {
    if (!file_info_list) return;
    (
      async () => {
        try {
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
        } catch (e) {
          log.error(this.log_prefix, '[deleteFiles]', file_base_path, file_info_list, e)
        }
      }
    )()
  }
}

const operation_file_service = new OperationFileServiceClass()
export default operation_file_service
