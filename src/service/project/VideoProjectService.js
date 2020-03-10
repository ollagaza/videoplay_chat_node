import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil'
import log from '../../libs/logger'
import CloudFileService from '../cloud/CloudFileService'

import { VideoProjectField, VideoProjectModel } from '../../database/mongodb/VideoProject'

const VideoProjectServiceClass = class {
  constructor () {
    this.log_prefix = '[VideoProjectService]'
  }

  getVideoProjectList = async (group_seq) => {
    return await VideoProjectModel.findByGroupSeq(group_seq, '-sequence_list');
  }

  getVideoProjectInfo = async (project_seq) => {
    return await VideoProjectModel.findOneById(project_seq)
  }

  createVideoProject = async (group_member_info, member_seq, request) => {
    const data = request.body

    const content_id = Util.getContentId();
    const media_root = ServiceConfig.get('media_root');
    const project_path = `${group_member_info.media_path}/studio/${content_id}/`;

    await Util.createDirectory(media_root + project_path);
    data.group_seq = group_member_info.group_seq
    data.member_seq = member_seq
    data.content_id = content_id
    data.project_path = project_path
    data.parent_directory = data.parent_directory || ''

    const fields = VideoProjectField();
    fields.group_seq.require = true;
    fields.member_seq.require = true;
    fields.content_id.require = true;
    fields.project_name.require = true;
    fields.project_path.require = true;
    fields.total_time.require = true;
    fields.sequence_list.require = true;

    const payload = Util.getPayload(data, fields);

    return await VideoProjectModel.createVideoProject(payload);
  }

  modifyVideoProject = async (project_seq, request) => {
    const data = request.body;
    data.sequence_count = data.sequence_list ? data.sequence_list.length : 0;

    const fields = VideoProjectField();
    fields.project_name.require = true;
    fields.sequence_list.require = true;
    fields.operation_seq_list.require = true;
    fields.sequence_list.require = true;

    const payload = Util.getPayload(data, fields);

    return await VideoProjectModel.updateFromEditor(project_seq, payload);
  }

  updateFavorite = async (project_seq, is_favorite) => {
    return await VideoProjectModel.updateFavorite(project_seq, is_favorite);
  }

  updateStatus = async (request, group_seq, status) => {
    const project_seq_list = request.id_list
    return await VideoProjectModel.updateStatus(group_seq, project_seq_list, status);
  }

  deleteVideoProject = async (group_seq, project_seq) => {
    const project_info = await VideoProjectModel.deleteById(group_seq, project_seq);
    this.deleteProjectFiles(project_info)
    return project_info
  }

  deleteProjectFiles = (project_info) => {
    (
      async (project_info) => {
        const media_root = ServiceConfig.get('media_root');
        const project_path = project_info.project_path;
        try {
          await Util.deleteDirectory(media_root + project_path);
        } catch (error) {
          log.error(this.log_prefix, '[deleteProjectFiles]', 'Util.deleteDirectory', media_root + project_path,  error)
        }

        try {
          await CloudFileService.requestDeleteFile(project_path, true)
        } catch (error) {
          log.error(this.log_prefix, '[deleteProjectFiles]', 'CloudFileService.requestDeleteFile', project_path,  error)
        }
      }
    )(project_info);
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    await VideoProjectModel.migrationGroupSeq(member_seq, group_seq)
  }
}

const video_project_service = new VideoProjectServiceClass()
export default video_project_service
