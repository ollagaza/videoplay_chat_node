import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  OperationMediaInfo:
 *    type: "object"
 *    description: "비디오의 메타 데이터"
 *    properties:
 *      video_file_name:
 *        type: "string"
 *        description: "비디오 파일 명"
 *      fps:
 *        type: "number"
 *        description: "비디오 프레임 레이트"
 *      width:
 *        type: "number"
 *        description: "비디오 폭 (px)"
 *      height:
 *        type: "number"
 *        description: "비디오 높이 (px)"
 *      total_time:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      total_frame:
 *        type: "string"
 *        description: "비디오의 총 프레임 수"
 *      origin_video_url:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      proxy_video_url:
 *        type: "string"
 *        description: "비디오의 총 프레임 수"
 *      streaming_url:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      video_source:
 *        type: "string"
 *        description: "비디오의 총 프레임 수"
 *
 */

export default class OperationMediaInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys([
      'video_file_name', 'fps', 'width', 'height', 'total_frame', 'total_time',
      'origin_video_url', 'proxy_video_url', 'streaming_url', 'video_source'
    ]);
  }

  setUrl = (media_directory, url_prefix) => {
    if (this.is_active == 1) {
      this.origin_video_url = url_prefix + "SEQ/" + this.video_file_name;
      this.proxy_video_url = url_prefix + "SEQ/" + this.proxy_file_name;
      this.video_source = "SEQ\\" + this.video_file_name;
      this.origin_video_path = media_directory + this.video_source;
    }
  };
}
