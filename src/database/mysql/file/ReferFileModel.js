import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'

import FileInfo from '../../../wrapper/file/FileInfo'

export default class ReferFileModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'refer_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[ReferFileModel]'
  }

  createReferFile = async (upload_file_info, storage_seq, media_path) => {
    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, media_path)).toJSON();
    file_info.storage_seq = storage_seq;

    return await this.create(file_info, 'seq');
  };

  referFileSummary = async (storage_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size'];
    return await this.findOne({storage_seq: storage_seq, status: 'Y'}, select);
  };

  referFileList = async (storage_seq) => {
    const service_info = ServiceConfig.getServiceInfo();
    const result_list = await this.find({storage_seq: storage_seq, status: 'Y'});
    const list = [];
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        list.push(new FileInfo(result_list[i]).setUrl(service_info.static_storage_prefix));
      }
    }
    return list;
  };

  deleteAll = async (storage_seq) => {
    await this.delete({storage_seq: storage_seq});
  };

  deleteSelectedFiles = async (file_seq_list) => {
    const oKnex = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .whereIn('seq', file_seq_list);
    const result_list = await oKnex;
    if (!result_list || result_list.length <= 0) {
      return true;
    }

    await this.database
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
      .del();

    (async () => {
      const service_info = ServiceConfig.getServiceInfo();
      const media_root = service_info.media_root;

      for (let i = 0; i < result_list.length; i++) {
        const file_info = result_list[i];
        const target_path = media_root + file_info.file_path;
        await Util.deleteFile(target_path);
      }
    })();

    return true;
  };
}
