import ModelObject from '@/classes/ModelObject';
import MemberModel from '@/models/MemberModel';
import VideoProjectInfo from '@/classes/surgbook/VideoProjectInfo';
import StdObject from '@/classes/StdObject';
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import ContentIdManager from '@/classes/ContentIdManager';
import log from "@/classes/Logger";

export default class VideoProjectModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'video_project';
    this.selectable_fields = ['*'];
  }

  createVideoProjectInfo = async (body, member_seq) => {
    const project = new VideoProjectInfo(body);
    project.setIgnoreEmpty(true);
    const video_project_info = project.toJSON();
    log.d(null, video_project_info);
    const member_info = await new MemberModel({ database: this.database }).getMemberInfo(member_seq);
    if (!member_info || member_info.isEmpty()) {
      throw new StdObject(-1, '회원정보가 없습니다.', 401)
    }

    const service_info = service_config.getServiceInfo();
    const content_id = await ContentIdManager.getContentId();
    const media_root = service_info.media_root;
    const sequence_file_name = 'sequence.json';
    const user_media_path = member_info.user_media_path;
    video_project_info.member_seq = member_seq;
    video_project_info.content_id = content_id;
    video_project_info.project_path = user_media_path + "VideoProject\\" + content_id + "\\";
    video_project_info.sequence_file_name = sequence_file_name;

    await Util.createDirectory(media_root + video_project_info.project_path);
    const sequence_file_path = media_root + video_project_info.project_path + sequence_file_name;
    if ( await Util.writeFile(sequence_file_path, JSON.stringify(body.sequence_list, null, 2)) ) {
      const project_seq = await this.create(video_project_info, 'seq');
      return project_seq;
    }
    return 0;
  };

  getVideoProjectInfo = async (project_seq) => {
    const video_project_info = new VideoProjectInfo(await this.findOne({seq: project_seq}));
    video_project_info.setUrl();
    video_project_info.setIgnoreEmpty(true);
    const video_project = video_project_info.toJSON();

    if (!video_project_info.isEmpty()) {

      const service_info = service_config.getServiceInfo();
      const media_root = service_info.media_root;
      const sequence_file_path = media_root + video_project_info.project_path + video_project_info.sequence_file_name;
      const sequence_data = await Util.readFile(sequence_file_path);
      if (sequence_data) {
        video_project.sequence_list = JSON.parse(sequence_data);
      }
    }
    return video_project;
  };

  getVideoProjectList = async (member_seq) => {
    const result_list = await this.find({member_seq});
    const list = [];
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        const video_project_info = new new VideoProjectInfo(result_list[i]);
        video_project_info.setIgnoreEmpty(true);
        list.push(video_project_info.toJSON());
      }
    }
    return list;
  };

  updateVideoProject = async (body, project_seq) => {
    const video_project_info = new VideoProjectInfo(await this.findOne({seq: project_seq}));const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;
    const sequence_file_path = media_root + video_project_info.project_path + video_project_info.sequence_file_name;
    if ( await Util.writeFile(sequence_file_path, JSON.stringify(body.sequence_list, null, 2)) ) {
      const update_params = {
        "project_name": body.project_name,
        "total_time": body.total_time,
        "modify_date": this.database.raw('NOW()')
      };
      return await this.update({seq: project_seq}, update_params);
    }
    return false;
  };

  requestVideoProject = async (project_seq) => {
    const update_params = {
      "status": 'R',
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({seq: project_seq}, update_params);
  };

  updateVideoProjectProgress = async (project_seq, progress) => {
    const update_params = {
      "progress": progress,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({seq: project_seq}, update_params);
  };

  updateVideoProjectProgressComplete = async (project_seq, video_file_name, total_size, smil_file_name) => {
    const update_params = {
      "status": 'Y',
      "progress": 100,
      "is_trans_complete": 1,
      "video_file_name": video_file_name,
      "total_size": total_size,
      "modify_date": this.database.raw('NOW()')
    };
    if (smil_file_name) {
      update_params.smil_file_name = smil_file_name;
    }
    return await this.update({seq: project_seq}, update_params);
  };

  deleteVideoProjectProgress = async (project_seq) => {
    return await this.delete({seq: project_seq});
  };
}
