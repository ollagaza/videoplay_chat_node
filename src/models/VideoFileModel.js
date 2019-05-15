import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import SmilInfo from '@/classes/surgbook/SmilInfo';
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';
import log from "@/classes/Logger";

export default class VideoFileModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'video_file';
    this.selectable_fields = ['*'];
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

  updateThumb = async (file_seq, thumbnail_path) => {
    await this.update({seq: file_seq}, {thumbnail: thumbnail_path})
  };

  deleteAll = async (storage_seq, trash_path) => {
    await this.update({"storage_seq": storage_seq}, {
      "status": "D",
      "file_path": trash_path,
      "modify_date": this.database.raw('NOW()')
    });
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
    if ( !( await Util.fileExists(trash_directory) ) ) {
      await Util.createDirectory(trash_directory);
    }

    for (let i = 0; i < result_list.length; i++) {
      const file_info = result_list[i];
      const target_path = media_root + file_info.file_path;
      const dest_path = trash_directory + file_info.file_name;
      await Util.renameFile(target_path, dest_path);
    }

    return true;
  };

  syncVideoFiles = async (operation_info, operation_media_info, storage_seq) => {
    const smil_info = await new SmilInfo().loadFromXml(operation_info.media_directory, operation_media_info.smil_file_name);

    let origin_video_size = 0;
    let origin_video_count = 0;
    let trans_video_size = 0;
    let trans_video_count = 0;

    if (!smil_info.isEmpty()) {
      const video_directory = operation_info.media_directory + 'SEQ\\';
      const media_path = Util.removePathSEQ(operation_info.media_path) + 'SEQ';
      if (!operation_info.created_by_user || operation_info.created_by_user === false) {
        await this.delete({storage_seq: storage_seq});
      }
      const file_list = await Util.getDirectoryFileList(video_directory);
      for (let i = 0; i < file_list.length; i++) {
        const file = file_list[i];
        if (file.isFile()) {
          const file_name = file.name;
          const video_file_path = video_directory + file_name;
          const file_info = (await new FileInfo().getByFilePath(video_file_path, media_path, file_name)).toJSON();
          if (file_info.file_type === 'video') {
            if (smil_info.isTransVideo(file_name) || file_name === operation_media_info.video_file_name) {
              trans_video_count++;
              trans_video_size += file_info.file_size;
              continue;
            }
            file_info.storage_seq = storage_seq;
            origin_video_count++;
            origin_video_size += file_info.file_size;

            if (!operation_info.created_by_user || operation_info.created_by_user === false) {
              const upload_seq = await this.create(file_info, 'seq');
              await this.createVideoThumbnail(video_file_path, operation_info, upload_seq);
            }
          }
        }
      }
    }
    return {origin_video_size, origin_video_count, trans_video_size, trans_video_count};
  };

  createVideoThumbnail = async (origin_video_path, operation_info, upload_seq) => {
    const dimension = await Util.getVideoDimension(origin_video_path);
    if (!dimension.error && dimension.width && dimension.height) {

      const thumbnail_path = Util.removePathSEQ(operation_info.media_path) + 'Thumb\\' + Date.now() + '.jpg';
      const thumbnail_full_path = operation_info.media_root + thumbnail_path;

      const thumb_width = Util.parseInt(service_config.get('thumb_width'), 212);
      const thumb_height = Util.parseInt(service_config.get('thumb_height'), 160);

      const execute_result = await Util.getThumbnail(origin_video_path, thumbnail_full_path, 0, thumb_width, thumb_height);
      if ( execute_result.success && ( await Util.fileExists(thumbnail_full_path) ) ) {
        try {
          await this.updateThumb(upload_seq, thumbnail_path);
        } catch (error) {
          log.e(null, 'VideoFileModel.createVideoThumbnail', error);
        }
      }
    }
  }
}
