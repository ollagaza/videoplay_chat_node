import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'
import OperationService from '../../service/operation/OperationService'

export default class OperationMediaInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys([
      'video_file_name', 'fps', 'width', 'height', 'total_frame', 'total_time',
      'origin_video_url', 'proxy_video_url', ' is_trans_complete',
      'hls_streaming_url', 'dash_streaming_url', 'proxy_max_height'
    ]);

    this.is_trans_complete = false;
    if (data) {
      this.is_trans_complete = parseInt(data.is_trans_complete) > 0;
    }
  }

  setUrl = (operation_info) => {
    if (this.is_trans_complete) {
      // const url_prefix = operation_info.url_prefix;
      const directory_info = OperationService.getOperationDirectoryInfo(operation_info)
      const proxy_file_name = Util.isEmpty(this.proxy_file_name) ? this.video_file_name : this.proxy_file_name

      this.origin_video_url = directory_info.media_video + this.video_file_name;

      if (Util.isEmpty(this.stream_url)){
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + directory_info.media_video + proxy_file_name + '/master.m3u8';
        this.dash_streaming_url = ServiceConfig.get('dash_streaming_url') + directory_info.media_video + proxy_file_name + '/manifest.mpd';
      } else {
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + directory_info.media_video + this.stream_url + '/master.m3u8';
        this.dash_streaming_url = ServiceConfig.get('dash_streaming_url') + directory_info.media_video + this.stream_url + '/manifest.mpd';
      }
    }
  };
}