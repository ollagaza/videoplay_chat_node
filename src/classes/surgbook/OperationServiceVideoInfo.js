import JsonWrapper from '@/classes/JsonWrapper';
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';

/**
 * @swagger
 * definitions:
 *  OperationServiceVideoInfo:
 *    type: "object"
 *    description: "비디오의 메타 데이터"
 *    properties:
 *      video_file_name:
 *        type: "string"
 *        description: "비디오 파일 명"
 *      width:
 *        type: "number"
 *        description: "비디오 폭 (px)"
 *      height:
 *        type: "number"
 *        description: "비디오 높이 (px)"
 *      total_time:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      origin_video_url:
 *        type: "string"
 *        description: "원본영상 다운로드 url"
 *      proxy_video_url:
 *        type: "string"
 *        description: "프록시 영상 다운로드 url"
 *      video_source:
 *        type: "string"
 *        description: "동영상 상대경로"
 *      status:
 *        type: "boolean"
 *        description: "트랜스코딩 완료 여부. 완료상태에서만 공유와 큐레이션 가능"
 *      hls_streaming_url:
 *        type: "string"
 *        description: "hls 스트리밍 url"
 *      rtmp_streaming_server:
 *        type: "string"
 *        description: "rtmp 스트리밍 서버 "
 *      rtmp_streaming_name:
 *        type: "string"
 *        description: "rtmp 스트리밍 이름"
 *
 */

export default class OperationServiceVideoInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys([
      'video_file_name', 'width', 'height', 'total_time', 'status',
      'hls_streaming_url', 'rtmp_streaming_server', 'rtmp_streaming_name'
    ]);

    this.is_trans_complete = false;
    if (data) {
      this.is_trans_complete = parseInt(data.is_trans_complete) > 0;
    }
  }

  setUrl = (operation_info) => {
    if (this.status === 'Y') {
      const media_directory = operation_info.media_directory;
      const url_prefix = operation_info.url_prefix;
      const url_media_path = Util.pathToUrl(operation_info.media_path);

      this.origin_video_url = url_prefix + "SEQ/" + this.video_file_name;
      this.proxy_video_url = url_prefix + "SEQ/" + this.proxy_file_name;
      this.video_source = "SEQ\\" + this.video_file_name;
      this.origin_video_path = media_directory + this.video_source;

      if (Util.isEmpty(this.smil_file_name)){
        this.hls_streaming_url = service_config.get('hls_streaming_url') + url_media_path + this.video_file_name + '/playlist.m3u8';
      } else {
        this.hls_streaming_url = service_config.get('hls_streaming_url') + url_media_path + this.smil_file_name + '/playlist.m3u8';
      }
      this.rtmp_streaming_server = service_config.get('rtmp_streaming_url');
      this.rtmp_streaming_name = url_media_path + this.proxy_file_name;
    }
  };
}