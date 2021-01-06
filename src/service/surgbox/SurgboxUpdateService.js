import DBMySQL from '../../database/knex-mysql'
import SurgboxUpdateModel from '../../database/mysql/surgbox/SurgboxUpdateModel'
import SurgboxUpdateFileModel from '../../database/mysql/surgbox/SurgboxUpdateFileModel'
import SurgboxUpdateInfo from '../../wrapper/surgbox/SurgboxUpdateInfo'
import SurgboxUpdateFileInfo from '../../wrapper/surgbox/SurgboxUpdateFileInfo'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../service-config'
import logger from '../../libs/logger'
import NaverObjectStorage from '../storage/naver-object-storage-service'
import semver from 'semver'

const SurgboxUpdateServiceClass = class {
  constructor () {
    this.log_prefix = '[SurgboxUpdateService]'
  }

  getUpdateModel = (database = null) => {
    if (database) {
      return new SurgboxUpdateModel(database)
    }
    return new SurgboxUpdateModel(DBMySQL)
  }

  getUpdateFileModel = (database = null) => {
    if (database) {
      return new SurgboxUpdateFileModel(database)
    }
    return new SurgboxUpdateFileModel(DBMySQL)
  }

  getUpdateInfoByRequest = (request_body, check_version = true) => {
    const request_info = new SurgboxUpdateInfo().getByRequestBody(request_body)
    if (request_info.isEmpty()) {
      throw new StdObject(101, '잘못된 요청입니다.', 400)
    }
    request_info.setIgnoreEmpty(true)
    request_info.setAutoTrim(true)
    const update_info = request_info.toJSON()
    if (check_version && !update_info.version) {
      throw new StdObject(102, '버전정보가 없습니다.', 400)
    }
    return update_info
  }

  createUpdateInfo = async (member_seq, request_body) => {
    const update_info = this.getUpdateInfoByRequest(request_body)
    update_info.member_seq = member_seq

    const file_path = `/surgbox/update/${update_info.version}/`
    const media_root = ServiceConfig.get('media_root')
    await Util.createDirectory(`${media_root}/${file_path}`)
    update_info.file_path = file_path

    const update_model = this.getUpdateModel()
    return update_model.createUpdateInfo(update_info)
  }

  getUpdateInfo = async (update_seq) => {
    const update_model = this.getUpdateModel()
    const update_info = await update_model.getUpdateInfo(update_seq)
    return new SurgboxUpdateInfo(update_info)
  }

  getUpdateList = async (request) => {
    const update_model = this.getUpdateModel()
    const request_query = request.query ? request.query : {}
    const page = Util.parseInt(request_query.page, 1)
    const limit = Util.parseInt(request_query.limit, 20)
    const search = request_query.search ? request_query.search : null
    const order = request_query.order ? request_query.order : null
    const order_id = request_query.order_id ? request_query.order_id : null

    const search_options = {
      page,
      limit,
      search,
      order,
      order_id
    }
    return update_model.getUpdatePageList(search_options)
  }

  getUpdateListForBox = async () => {
    const result = {
      has_update: false,
      last_version: null,
      min_version: null,
      update: {}
    }
    const update_model = this.getUpdateModel()
    const query_result = await update_model.getUpdateList()
    if (query_result && query_result.length) {
      const update = result.update
      let last_version = null
      let min_version = null
      for (let i = 0; i < query_result.length; i++) {
        const update_info = query_result[i]
        const version = update_info.version
        const file_path = update_info.file_path
        const is_force = update_info.is_force === 1
        let version_info = update[version]
        if (!version_info) {
          version_info = {
            version,
            is_force,
            file_count: update_info.total_file_count,
            file_size: update_info.total_file_size,
            title: update_info.title,
            description: update_info.desc,
            reg_date: update_info.reg_date,
            modify_date: update_info.modify_date,
            file_list: []
          }
          update[version] = version_info
          if (!last_version) last_version = version
          else if (semver.gt(version, last_version)) last_version = version

          if (is_force) {
            if (!min_version) min_version = version
            else if (semver.gt(version, last_version)) min_version = version
          }
        }
        if (update_info.file_name) {
          version_info.file_list.push(ServiceConfig.get('cdn_url') + file_path + update_info.file_name)
        }
      }
      result.has_update = true
      result.last_version = last_version
      result.min_version = min_version
    }
    return result
  }

  getUpdateInfoForView = async (update_seq) => {
    const update_model = this.getUpdateModel()
    const update_info = await update_model.getUpdateInfoForView(update_seq)
    const update_file_model = this.getUpdateFileModel()
    const file_result = await update_file_model.getFileList(update_seq)
    const update_file_list = []
    if (file_result) {
      for (let i = 0; i < file_result.length; i++) {
        const file_info = new SurgboxUpdateFileInfo(file_result[i])
        file_info.url = ServiceConfig.get('cdn_url') + update_info.file_path + file_info.file_name
        update_file_list.push(file_info.toJSON())
      }
    }

    return {
      update_info,
      update_file_list
    }
  }

  uploadFile = async (update_seq, request, response) => {
    const update_info = await this.getUpdateInfo(update_seq)
    const upload_path = update_info.file_path
    const upload_directory = `${ServiceConfig.get('media_root')}${update_info.file_path}`
    logger.debug(this.log_prefix, '[uploadFile]', `{ update_seq: ${update_seq} }`, upload_directory)
    if (!(await Util.fileExists(upload_directory))) {
      await Util.createDirectory(upload_directory)
    }

    const file_field_name = 'update_file'
    await Util.uploadByRequest(request, response, file_field_name, upload_directory, null, false, true)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(201, '파일 업로드가 실패하였습니다.', 500)
    }
    const file_name = request.new_file_name
    await NaverObjectStorage.moveFile(upload_directory + file_name, upload_path, file_name)

    upload_file_info.new_file_name = file_name
    const file_info = new SurgboxUpdateFileInfo().getByUploadFileInfo(update_seq, upload_file_info, upload_path, file_name)
    file_info.setIgnoreEmpty(true)

    const update_file_model = this.getUpdateFileModel()
    const update_file_seq = await update_file_model.createUpdateFile(file_info.toJSON())
    const file_url = `${ServiceConfig.get('static_storage_prefix')}${upload_path}${file_name}`

    await this.updateSummary(update_seq)

    return {
      update_file_seq,
      file_url
    }
  }

  modifyUpdateInfo = async (update_seq, request_body) => {
    if (!request_body || !request_body.update_data) {
      throw new StdObject(131, '잘못된 요청입니다.', 400)
    }
    let update_result = false
    let delete_file_path_list = null
    const update_info = this.getUpdateInfoByRequest(request_body.update_data, false)
    await DBMySQL.transaction(async (transaction) => {
      const update_model = this.getUpdateModel(transaction)
      update_result = await update_model.modifyUpdateInfo(update_seq, update_info)
      delete_file_path_list = await this.deleteFileByList(transaction, update_seq, request_body.delete_file_seq_list)
    });

    if (delete_file_path_list) {
      const prev_update_info = await this.getUpdateInfo(update_seq)
      this.deleteFiles(prev_update_info.file_path, delete_file_path_list)
      await this.updateSummary(update_seq)
    }

    return update_result
  }

  deleteFileByList = async (database, update_seq, delete_file_seq_list) => {
    if (!delete_file_seq_list || delete_file_seq_list.length < 1) return;

    const update_file_model = this.getUpdateFileModel(database)
    const delete_file_path_list = []
    for (let i = 0; i < delete_file_seq_list.length; i++) {
      const file_info = await update_file_model.getUpdateFile(update_seq, delete_file_seq_list[i])
      if (!file_info) continue
      await update_file_model.deleteUpdateFile(update_seq, file_info.seq)
      delete_file_path_list.push(file_info.file_name)
    }

    return delete_file_path_list
  }

  deleteFiles = (file_path, file_path_list) => {
    (
      async (file_path, file_path_list) => {
        const upload_directory = `${ServiceConfig.get('media_root')}${file_path}`
        for (let i = 0; i < file_path_list.length; i++) {
          try {
            await Util.deleteFile(upload_directory + file_path_list[i])
            // await NaverObjectStorage.deleteFile(upload_directory, file_path_list[i])
          } catch (error) {
            logger.error(this.log_prefix, '[deleteFiles]', file_path_list[i])
          }
        }
      }
    )(file_path, file_path_list)
  }

  updateSummary = async (update_seq) => {
    const update_file_model = this.getUpdateFileModel()
    const summary_info = await update_file_model.getFileSummary(update_seq)
    const update_model = this.getUpdateModel()
    await update_model.updateFileSummary(update_seq, summary_info)
  }

  deleteUpdateInfo = async (update_seq) => {
    const update_model = this.getUpdateModel()
    const update_info = await this.getUpdateInfo(update_seq)
    if (!update_info) throw new StdObject(-1, '등록된 정보가 없습니다.', 400)
    const delete_result = await update_model.deleteUpdateInfo(update_seq)
    this.deleteDirectory(update_info)
    return delete_result
  }

  deleteDirectory = (update_info) => {
    (
      async (update_info) => {
        try {
          const file_path = update_info.file_path
          await Util.deleteDirectory(ServiceConfig.get('media_root') + file_path)
          await NaverObjectStorage.deleteFolder(file_path)
        } catch (error) {
          logger.error(this.log_prefix, '[deleteDirectory]', update_info.toJSON(), error)
        }
      }
    )(update_info)
  }
}

const SurgboxUpdateService = new SurgboxUpdateServiceClass()
export default SurgboxUpdateService
