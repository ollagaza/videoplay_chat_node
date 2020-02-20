import Constants from '../../constants/constants';
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
      const directory_info = OperationService.getOperationDirectoryInfo(operation_info)

      this.origin_video_url = directory_info.url_video + this.video_file_name;
      this.proxy_video_url = directory_info.url_video + this.proxy_file_name;

      if (Util.isEmpty(this.stream_url)){
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + directory_info.media_video + this.video_file_name + '/playlist.m3u8';
      } else {
        this.hls_streaming_url = ServiceConfig.get('hls_streaming_url') + directory_info.media_video + this.stream_url + '/playlist.m3u8';
      }
    }
  };
}
