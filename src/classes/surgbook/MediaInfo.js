import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  MediaInfo:
 *    type: "object"
 *    properties:
 *      media_id:
 *        type: "integer"
 *        description: "동영상 고유번호"
 *      operation:
 *        type: "string"
 *        description: "수술 케이스명"
 *      file_no:
 *        type: "integer"
 *        description: "파일 개수"
 *      file_size:
 *        type: "integer"
 *        description: "파일 용량 (MB)"
 *      runtime:
 *        type: "integer"
 *        description: "동영상 길이 (sec)"
 *      clip_no:
 *        type: "integer"
 *        description: "클립 개수"
 *      video_no:
 *        type: "integer"
 *        description: "비디오 파일 개수"
 *      report_no:
 *        type: "integer"
 *        description: "레포트 개수"
 *      is_analysis:
 *        type: "boolean"
 *        description: "분석 여부"
 *      is_request:
 *        type: "boolean"
 *        description: "요약비디오 요청 여부"
 *      is_review:
 *        type: "boolean"
 *        description: "검토 여부"
 *      is_sharing:
 *        type: "boolean"
 *        description: "공유 여부"
 *      origin_video_url:
 *        type: "string"
 *        description: "원본 비디오 URL"
 *      proxy_video_url:
 *        type: "string"
 *        description: "편집기용 비디오 URL"
 *      list_no:
 *        type: "integer"
 *        description: "리스트 인련번호"
 *      video_info:
 *        $ref: "#definitions/VideoInfo"
 *
 */

export default class MediaInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);
  }
}
