import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'

export default class OperationFileInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.setKeys([
      'seq', 'operation_seq', 'file_name', 'file_size', 'file_type', 'url'
    ])
  }

  setUrl = () => {
    const cloud_url = ServiceConfig.get('static_cloud_prefix')
    const static_url = ServiceConfig.get('static_storage_prefix')
    if (ServiceConfig.isVacs()) {
      this.url = static_url + this.file_path
    } else {
      this.url = cloud_url + this.file_path
    }

    return this
  }

  getByUploadFileInfo = async (operation_seq, upload_file_info, directory) => {
    this.setIgnoreEmpty(true)

    this.setKeys([
      'operation_seq', 'file_name', 'file_size', 'file_type', 'file_path'
    ])

    this.operation_seq = operation_seq
    this.file_name = upload_file_info.originalname
    this.file_size = upload_file_info.size
    this.file_path = directory + '/' + this.file_name
    this.file_type = await Util.getFileType(upload_file_info.path, this.file_name)

    this.is_empty = false

    return this
  }
}
