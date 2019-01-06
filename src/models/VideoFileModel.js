import php from 'phpjs';
import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import Util from '@/utils/baseutil';

export default class VideoFileModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'video_file';
    this.selectable_fields = ['*'];
  }

  createVideoFile = async (upload_file_info, operation_seq, media_path) => {
    const file_info = new FileInfo().getByUploadFileInfo(upload_file_info, media_path).toJSON();
    file_info.operation_seq = operation_seq;

    return await this.create(file_info, 'seq');
  };

  videoFileSummary = async (operation_seq) => {
    const select = ['COUNT(*) AS total_count', 'SUM(file_size) AS total_size'];
    return await this.findOne({operation_seq: operation_seq}, select);
  };
}
