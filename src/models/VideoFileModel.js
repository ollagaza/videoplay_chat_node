import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import service_config from '@/config/service.config';

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

  videoFileList = async (operation_seq) => {
    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;

    const result_list = await this.find({operation_seq: operation_seq});
    const list = new Array();
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        list.push(new FileInfo(result_list[i]).setUrl(media_root));
      }
    }
    return list;
  };

   updateThumb = async (file_seq, thumbnail_path) => {
     await this.update({seq: file_seq}, {thumbnail: thumbnail_path})
   };
}
