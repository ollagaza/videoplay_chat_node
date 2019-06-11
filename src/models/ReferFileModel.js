import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';
import Constants from '@/config/constants';

export default class ReferFileModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'refer_file';
    this.selectable_fields = ['*'];
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
    const service_info = service_config.getServiceInfo();
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

    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;

    for (let i = 0; i < result_list.length; i++) {
      const file_info = result_list[i];
      const target_path = media_root + file_info.file_path;
      await Util.deleteFile(target_path);
    }

    return true;
  };

  syncReferFiles = async (operation_info, storage_seq) => {
    const refer_directory = operation_info.media_directory + 'REF' + Constants.SEP;
    const media_path = Util.removePathSEQ(operation_info.media_path) + 'REF';

    let refer_file_size = 0;
    let refer_file_count = 0;

    await this.delete({storage_seq: storage_seq});
    const file_list = await Util.getDirectoryFileList(refer_directory);
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_name = file.name;
        const refer_file_path = refer_directory + file_name;
        const file_info = (await new FileInfo().getByFilePath(refer_file_path, media_path, file_name)).toJSON();
        file_info.storage_seq = storage_seq;

        refer_file_count++;
        refer_file_size += file_info.file_size;

        await this.create(file_info, 'seq');
      }
    }

    return {refer_file_size, refer_file_count};
  };
}
