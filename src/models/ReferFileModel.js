import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';

export default class ReferFileModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'refer_file';
    this.selectable_fields = ['*'];
  }

  createReferFile = async (upload_file_info, operation_seq, media_path) => {
    const file_info = new FileInfo().getByUploadFileInfo(upload_file_info, media_path).toJSON();
    file_info.operation_seq = operation_seq;

    return await this.create(file_info, 'seq');
  };

  referFileSummary = async (operation_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size'];
    return await this.findOne({operation_seq: operation_seq, status: 'Y'}, select);
  };

  referFileList = async (operation_seq) => {
    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;

    const result_list = await this.find({operation_seq: operation_seq, status: 'Y'});
    const list = [];
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        list.push(new FileInfo(result_list[i]).setUrl(media_root));
      }
    }
    return list;
  };

  deleteAll = async (operation_seq) => {
    await this.delete({operation_seq: operation_seq});
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

    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;

    result_list.forEach((file_info) => {
      const target_path = media_root + file_info.file_path;
      Util.delete(target_path);
    });

    return true;
  };
}
