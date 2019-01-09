import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import service_config from '@/config/service.config';
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
    return await this.findOne({operation_seq: operation_seq, status: 'Y'}, select);
  };

  videoFileList = async (operation_seq) => {
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

   updateThumb = async (file_seq, thumbnail_path) => {
     await this.update({seq: file_seq}, {thumbnail: thumbnail_path})
   };

   deleteAll = async (operation_seq, trash_path) => {
     await this.update({"operation_seq": operation_seq}, {"status": "D", "file_path": trash_path, "modify_date": this.database.raw('NOW()')});
   };

   deleteSelectedFiles = async (file_seq_list, media_directory) => {
     const oKnex = this.database
       .select(this.selectable_fields)
       .from(this.table_name)
       .whereIn('seq', file_seq_list);
     const result_list = await oKnex;
     if (!result_list || result_list.length <= 0) {
       return true;
     }

     const update_params = {
       "file_path": this.database.raw("REPLACE(file_path, '\\\\SEQ\\\\', '\\\\Trash\\\\')"),
       "status": "T",
       "modify_date": this.database.raw('NOW()')
     };

     await this.database
       .update(update_params)
       .from(this.table_name)
       .whereIn('seq', file_seq_list);

     const service_info = service_config.getServiceInfo();
     const media_root = service_info.media_root;
     const trash_directory = media_directory + 'Trash\\';
     if (!Util.fileExists(trash_directory)) {
       Util.createDirectory(trash_directory);
     }

     result_list.forEach((file_info) => {
        const target_path = media_root + file_info.file_path;
        const dest_path = trash_directory + file_info.file_name;
        Util.rename(target_path, dest_path);
     });

     return true;
   };
}