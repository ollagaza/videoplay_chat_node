import ServiceConfig from '../../../service/service-config';
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

  createReferFile = async (upload_file_info, storage_seq, media_path, is_moved = false) => {
    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, media_path)).toJSON();
    file_info.storage_seq = storage_seq;
    file_info.is_moved = is_moved

    return await this.create(file_info, 'seq');
  };

  referFileSummary = async (storage_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size'];
    return await this.findOne({storage_seq: storage_seq, status: 'Y'}, select);
  };

  getReferFileList = async (storage_seq) => {
    return await this.find({ storage_seq: storage_seq, status: 'Y' });
  };

  deleteAll = async (storage_seq) => {
    await this.delete({storage_seq: storage_seq});
  };

  deleteSelectedFiles = async (file_seq_list) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .whereIn('seq', file_seq_list);
    const result_list = await query;
    if (!result_list || result_list.length <= 0) {
      return null;
    }

    await this.database
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
      .del();

    return result_list;
  };
}
