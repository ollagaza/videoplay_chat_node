import log from '../../libs/logger'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'
import CloudFileInfo from '../../wrapper/file/CloudFileInfo'
import Constants from '../../constants/constants'

const CloudFileServiceClass = class {
  constructor () {
    this.log_prefix = '[CloudFileService]'
  }

  getFileList = async (file_path) => {
    const file_list = []
    const directory_file_list = Util.getDirectoryFileList(ServiceConfig.get('media_root') + file_path)
    for (let i = 0; i < directory_file_list.length; i++) {
      const file_info = directory_file_list[i]
      if (file_info.isFile()) {
        file_list.push({ "origin_file_name": file_info.name })
      }
    }
    return file_list
  }

  requestMoveFile = async (file_path, is_folder = true, response_url = null, method = 'POST', response_data = null) => {
    let file_list = null
    if (is_folder) {
      file_list = await this.getFileList(file_path)
    }
    return await this.requestMoveFileByList(file_path, file_list, is_folder, response_url, method, response_data)
  }

  requestMoveFileByList = async (file_path, file_list = null, is_folder = true, response_url = null, method = 'POST', response_data = null) => {
    if (is_folder && (!file_list || file_list.length === 0)) {
      return false
    }
    const cloud_file_info = new CloudFileInfo()
    cloud_file_info.origin_path = file_path
    cloud_file_info.is_folder = is_folder
    cloud_file_info.remote_path = file_path
    cloud_file_info.file_list = file_list
    if (response_url) {
      cloud_file_info.setResponseOption(response_url, method)
      if (response_data) {
        cloud_file_info.setResponseData(response_data)
      }
    }

    const request_options = {
      hostname: ServiceConfig.get('storage_server_domain'),
      port: ServiceConfig.get('storage_server_port'),
      path: '/api/jobs/files/move',
      method: 'POST'
    };
    log.debug(this.log_prefix, '[requestMoveFileByList]', 'file_path', request_options, cloud_file_info.toJSON())
    return await Util.httpRequest(request_options, cloud_file_info.toJSON())
  }

  requestDeleteFile = async (file_path, is_folder = true) => {
    const cloud_file_info = new CloudFileInfo()
    cloud_file_info.origin_path = file_path
    cloud_file_info.is_folder = is_folder
    cloud_file_info.origin_type = Constants.OBJECT
    cloud_file_info.origin_bucket = ServiceConfig.get('object_storage_bucket_name')

    const request_options = {
      hostname: ServiceConfig.get('storage_server_domain'),
      port: ServiceConfig.get('storage_server_port'),
      path: '/api/jobs/files/delete',
      method: 'POST'
    };
    return await Util.httpRequest(request_options, cloud_file_info.toJSON())
  }
}

const cloud_file_service = new CloudFileServiceClass()
export default cloud_file_service
