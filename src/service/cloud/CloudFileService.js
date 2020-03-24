import log from '../../libs/logger'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import CloudFileInfo from '../../wrapper/file/CloudFileInfo'
import Constants from '../../constants/constants'

const CloudFileServiceClass = class {
  constructor () {
    this.log_prefix = '[CloudFileService]'
    this.COPY = 'copy'
    this.MOVE = 'move'
    this.DELETE = 'delete'
    this.EXPIRE = 'expire'
  }

  getFileList = async (file_path) => {
    const file_list = []
    const directory_file_list = await Util.getDirectoryFileList(ServiceConfig.get('media_root') + file_path)
    log.debug(this.log_prefix, '[getFileList] - directory_file_list', ServiceConfig.get('media_root') + file_path, directory_file_list)
    for (let i = 0; i < directory_file_list.length; i++) {
      const file_info = directory_file_list[i]
      if (file_info.isFile()) {
        file_list.push(this.getFileObject(file_info.name))
      }
    }
    log.debug(this.log_prefix, '[getFileList] - file_list', ServiceConfig.get('media_root') + file_path, file_list)
    return file_list
  }

  getFileListByFileNameList = async (root_path, file_name_list) => {
    const file_list = []
    for (let i = 0; i < file_name_list.length; i++) {
      const file_name = file_name_list[i]
      if (await Util.fileExists(root_path + file_name)) {
        file_list.push(this.getFileObject(file_name))
      }
    }
    return file_list
  }

  getFileObject = (file_name) => {
    return { 'origin_file_name': file_name }
  }

  requestMoveToObject = async (file_path, is_folder = true, content_id = null, response_url = null, response_data = null, method = 'POST') => {
    let file_list = null
    if (!is_folder) {
      file_list = await this.getFileList(file_path)
    }
    return await this.requestMoveToObjectByList(file_path, file_list, is_folder, content_id, response_url, response_data, method)
  }

  requestMoveToObjectByList = async (file_path, file_list = null, is_folder = true, content_id = null, response_url = null, response_data = null, method = 'POST') => {
    if (!is_folder && (!file_list || file_list.length === 0)) {
      return false
    }
    const cloud_file_info = new CloudFileInfo()
    cloud_file_info.origin_path = file_path
    cloud_file_info.is_folder = is_folder
    cloud_file_info.remote_path = file_path
    cloud_file_info.file_list = file_list
    if (content_id) {
      cloud_file_info.content_id = content_id
    }

    return await this.requestApi(this.MOVE, cloud_file_info, response_url, response_data, method)
  }

  requestDownloadObject = async (download_path, file_path, is_folder = true, content_id = null, response_url = null, response_data = null, method = 'POST') => {
    let file_list = null
    if (!is_folder) {
      file_list = await this.getFileList(file_path)
    }
    return await this.requestDownloadObjectByList(file_path, file_list, is_folder, content_id, response_url, response_data, method)
  }

  requestDownloadObjectByList = async (download_path, file_path, file_list = null, is_folder = true, content_id = null, response_url = null, response_data = null, method = 'POST') => {
    if (!is_folder && (!file_list || file_list.length === 0)) {
      return false
    }
    const cloud_file_info = new CloudFileInfo()
    cloud_file_info.origin_type = Constants.OBJECT
    cloud_file_info.origin_bucket = ServiceConfig.get('object_storage_bucket_name')
    cloud_file_info.origin_path = file_path
    cloud_file_info.is_folder = is_folder
    cloud_file_info.remote_type = Constants.LOCAL
    cloud_file_info.remote_bucket = ServiceConfig.get('storage_server_root')
    cloud_file_info.remote_path = download_path
    cloud_file_info.file_list = file_list
    if (content_id) {
      cloud_file_info.content_id = content_id
    }

    return await this.requestApi(this.COPY, cloud_file_info, response_url, response_data, method)
  }

  requestDeleteObjectFile = async (file_path, is_folder = true, response_url = null, response_data = null, method = 'POST') => {
    let file_list = null
    if (!is_folder) {
      file_list = await this.getFileList(file_path)
    }
    return await this.requestDeleteObjectFileList(file_path, file_list, is_folder, response_url, response_data, method)
  }

  requestDeleteObjectFileList = async (file_path, file_list = null, is_folder = true, response_url = null, response_data = null, method = 'POST') => {
    const cloud_file_info = new CloudFileInfo()
    cloud_file_info.origin_path = file_path
    cloud_file_info.is_folder = is_folder
    cloud_file_info.origin_type = Constants.OBJECT
    cloud_file_info.origin_bucket = ServiceConfig.get('object_storage_bucket_name')
    cloud_file_info.file_list = file_list

    return await this.requestApi(this.DELETE, cloud_file_info, response_url, response_data, method)
  }

  requestApi = async (api_type, cloud_file_info, response_url = null, response_data = null, method = 'POST') => {
    const request_options = {
      hostname: ServiceConfig.get('storage_server_domain'),
      port: ServiceConfig.get('storage_server_port'),
      path: `/api/jobs/files/${api_type}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    if (response_url) {
      cloud_file_info.setResponseOption(response_url, method)
      if (response_data) {
        cloud_file_info.setResponseData(response_data)
      }
    }

    try {
      const request_result = await Util.httpRequest(request_options, JSON.stringify(cloud_file_info.toJSON()))
      log.debug(this.log_prefix, '[requestApi]', request_options, cloud_file_info.toJSON(), request_result)
    } catch (error) {
      log.error(this.log_prefix, '[requestApi]', request_options, cloud_file_info.toJSON(), error)
    }
  }
}

const cloud_file_service = new CloudFileServiceClass()
export default cloud_file_service
