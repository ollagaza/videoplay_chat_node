import ModelObject from '@/classes/ModelObject';
import role from '@/config/roles';
import OperationStorageInfo from '@/classes/surgbook/OperationStorageInfo';
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';

export default class OperationStorageModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_storage';
    this.selectable_fields = ['*'];
  }

  getOperationStorageInfo = async (operation_info) => {
    return new OperationStorageInfo(await this.findOne({operation_seq: operation_info.seq}));
  };

  createOperationStorageInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.seq
    };
    return await this.create(create_params, 'seq');
  };

  getOperationStorageInfoNotExistsCreate = async (operation_info) => {
    let operation_storage_info = await this.getOperationStorageInfo(operation_info);
    if (!operation_storage_info || operation_storage_info.isEmpty()) {
      await this.createOperationStorageInfo(operation_info);
      operation_storage_info = this.getOperationStorageInfo(operation_info);
    }
    return operation_storage_info;
  };

  updateUploadFileSize = async (storage_seq, file_type, update_summary=true) => {
    let file_size_info = null;
    let update_params = {};
    if (file_type === 'all' || file_type === 'video') {
      file_size_info = await new VideoFileModel({ database: this.database }).videoFileSummary(storage_seq);
      let total_size = file_size_info.total_size ? parseInt(file_size_info.total_size) : 0;
      total_size = Math.ceil(total_size / 1024 / 1024);
      update_params.origin_video_size = total_size;
      update_params.origin_video_count = (file_size_info.total_count ? parseInt(file_size_info.total_count) : 0);
    }
    if (file_type === 'all' || file_type === 'refer') {
      file_size_info = await new ReferFileModel({ database: this.database }).referFileSummary(storage_seq);
      let total_size = file_size_info.total_size ? parseInt(file_size_info.total_size) : 0;
      total_size = Math.ceil(total_size / 1024 / 1024);
      update_params.refer_file_size = total_size;
      update_params.refer_file_count = (file_size_info.total_count ? parseInt(file_size_info.total_count) : 0);
    }

    await this.update({seq: storage_seq}, update_params);
    if (update_summary) {
      await this.updateStorageSummary(storage_seq);
    }
  };

  updateStorageInfo = async (storage_seq, update_storage_info) => {
    await this.update({seq: storage_seq}, update_storage_info);
  };

  updateStorageSummary = async (storage_seq) => {
    const update_params = {
      "total_file_size": this.database.raw('index1_file_size + index2_file_size + origin_video_size + trans_video_size + refer_file_size + service_video_size'),
      "total_file_count": this.database.raw('origin_video_count + trans_video_count + refer_file_count + service_video_count'),
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({seq: storage_seq}, update_params);
  };

  getStorageSummary = async  (token_info) => {
    const columns = ["sum(operation_storage.total_file_count) as total_file_count", "sum(operation_storage.total_file_size) as total_file_size", "sum(operation_media.total_time) as total_run_time"];
    const oKnex = this.database.select(this.arrayToSafeQuery(columns));
    oKnex.from('operation');
    oKnex.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    oKnex.leftOuterJoin("operation_media", "operation_media.operation_seq", "operation.seq");
    if (token_info.getRole() <= role.MEMBER) {
      oKnex.where({member_seq: token_info.getId()});
    }
    oKnex.first();

    const result = await oKnex;
    const output = {};
    output.total_file_count = result.total_file_count ? result.total_file_count : 0;
    output.total_file_size = result.total_file_size ? result.total_file_size : 0;
    output.total_run_time = result.total_run_time ? result.total_run_time : 0;

    return output;
  };

  updateClipCount = async (storage_seq, clip_count) => {
    return await this.update({"seq": storage_seq}, {clip_count: clip_count, "modify_date": this.database.raw('NOW()')});
  };

  updateIndexCount = async (storage_seq, index_type, count) => {
    const params = {};
    params['index' + index_type + '_file_count'] = count;
    params.modify_date = this.database.raw('NOW()');
    return await this.update({"seq": storage_seq}, params);
  };
}
