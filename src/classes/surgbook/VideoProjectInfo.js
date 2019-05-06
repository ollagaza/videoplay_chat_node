import JsonWrapper from '@/classes/JsonWrapper';
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';

export default class VideoProjectInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.setKeys(['seq', 'content_id', 'project_name', 'sequence_file_url', 'video_file_url', 'total_time', 'total_size', 'status', 'progress', 'is_trans_complete', 'reg_date', 'modify_date']);
  }

  setUrl = () => {
    const project_url = Util.pathToUrl(this.project_path);
    const url_prefix = service_config.get('static_storage_prefix');
    this.sequence_file_url = url_prefix + this.sequence_file_name;
    if (this.is_trans_complete) {
      this.video_file_url = url_prefix + this.video_file_name;

      if (Util.isEmpty(this.smil_file_name)){
        this.hls_streaming_url = service_config.get('hls_streaming_url') + project_url + this.video_file_name + '/playlist.m3u8';
      } else {
        this.hls_streaming_url = service_config.get('hls_streaming_url') + project_url + this.smil_file_name + '/playlist.m3u8';
      }
    }
  };
}
