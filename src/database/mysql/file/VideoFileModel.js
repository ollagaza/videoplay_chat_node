import path from 'path';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'

import FileInfo from '../../../wrapper/file/FileInfo'
import OperationService from '../../../service/operation/OperationService'

export default class VideoFileModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'video_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[VideoFileModel]'
  }

  createVideoFile = async (upload_file_info, storage_seq, media_path) => {
    const file_info = (await new FileInfo().getByUploadFileInfo(upload_file_info, media_path)).toJSON();
    file_info.storage_seq = storage_seq;

    return await this.create(file_info, 'seq');
  };

  videoFileSummary = async (storage_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size'];
    return await this.findOne({storage_seq: storage_seq, status: 'Y'}, select);
  };

  videoFileList = async (storage_seq) => {
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

  updateThumb = async (file_seq, thumbnail_path) => {
    await this.update({seq: file_seq}, {thumbnail: thumbnail_path})
  };

  deleteAll = async (storage_seq) => {
    await this.delete({ storage_seq: storage_seq });
  };

  deleteSelectedFiles = async (file_seq_list) => {
    await this.database
      .from(this.table_name)
      .whereIn('seq', file_seq_list)
      .del();
    return true;
  };

  createVideoFileByFileInfo = async (operation_info, storage_seq, file_info, make_thumbnail = true) => {
    if (file_info.file_type === Constants.VIDEO) {
      const video_full_path = file_info.full_path;
      file_info.storage_seq = storage_seq;
      if (make_thumbnail) {
        file_info.thumbnail = await this.createVideoThumbnail(video_full_path, operation_info);
      }
      file_info.addKey('storage_seq');
      file_info.addKey('thumbnail');
      await this.create(file_info.toJSON(), 'seq');
      return true;
    }
    return false;
  };

  syncVideoFiles = async (operation_info, add_video_file_list, storage_seq) => {
    if (operation_info.created_by_user !== true) {
      await this.deleteByStorageSeq(storage_seq);
      for (let i = 0; i < add_video_file_list.length; i++) {
        const file_info = add_video_file_list[i];
        file_info.storage_seq = storage_seq;
        await this.create(file_info);
      }
    }
  };

  deleteByStorageSeq = async (storage_seq) => {
    await this.delete({storage_seq: storage_seq});
  };
}
