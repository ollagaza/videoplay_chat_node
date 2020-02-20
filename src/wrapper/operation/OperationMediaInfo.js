import Constants from '../../constants/constants';
import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'

export default class OperationMediaInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys([
      'video_file_name', 'fps', 'width', 'height', 'total_frame', 'total_time',
      'origin_video_url', 'proxy_video_url', ' is_trans_complete',
      'hls_streaming_url', 'proxy_max_height'
    ]);

    this.is_trans_complete = false;
    if (data) {
      this.is_trans_complete = parseInt(data.is_trans_complete) > 0;
    }
  }

  setUrl = (operation_info) => {
    if (this.is_trans_complete) {
      // const url_prefix = operation_info.url_prefix;
      const vod_url_prefix = operation_info.vod_url_prefix;
      const url_media_path = Util.pathToUrl(operation_info.media_path);

      this.origin_video_url = vod_url_prefix + "SEQ/" + this.video_file_name;
      this.proxy_video_url = vod_url_prefix + "SEQ/" + this.proxy_file_name;
      this.video_source = "SEQ" + Constants.SEP + this.video_file_name;
      this.origin_video_path = operation_info.media_directory + this.video_source;
      this.trans_video_path = operation_info.trans_directory + this.video_source;

      if (Util.isEmpty(this.smil_file_name)){
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + url_media_path + this.video_file_name + '/playlist.m3u8';
      } else {
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + url_media_path + this.smil_file_name + '/playlist.m3u8';
      }
    }
  };
}
