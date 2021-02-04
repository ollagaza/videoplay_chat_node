import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'

export default class OperationFileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'directory', 'file_name', 'file_size', 'file_type', 'url', 'download_url', 'full_path', 'thumbnail_url'
    ])
  }

  setUrl = () => {
    const cloud_url = ServiceConfig.get('static_cloud_prefix')
    const static_url = ServiceConfig.get('static_storage_prefix')
    const cdn_url = ServiceConfig.get('cdn_url')
    if (ServiceConfig.isVacs()) {
      this.url = static_url + this.file_path
      this.download_url = static_url + this.file_path
      this.thumbnail_url = static_url + this.thumbnail_path
    } else {
      this.url = cdn_url + this.file_path
      this.download_url = cloud_url + this.file_path
      this.thumbnail_url = cdn_url + this.thumbnail_path
    }
    this.full_path = this.directory + '/' + this.file_name

    return this
  }

  getByUploadFileInfo = async (operation_seq, upload_file_info, directory, media_path) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'operation_seq', 'directory', 'file_name', 'file_path', 'file_size', 'file_type', 'thumbnail_path'
    ])

    this.operation_seq = operation_seq
    this.directory = directory
    this.file_name = upload_file_info.originalname
    this.file_path = media_path + upload_file_info.new_file_name
    this.file_size = upload_file_info.size
    this.file_type = await Util.getFileType(upload_file_info.path, this.file_name)

    this.is_empty = false

    return this
  }
}
