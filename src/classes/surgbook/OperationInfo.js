import JsonWrapper from '@/classes/JsonWrapper';
import MediaInfo from '@/classes/surgbook/MediaInfo';
import Util from '@/utils/baseutil';

/**
 * @swagger
 * definitions:
 *  OperationInfo:
 *    type: "object"
 *    description: "수술, 환자 상세 정보"
 *    properties:
 *      seq:
 *        type: "integer"
 *        description: "수술 고유 번호"
 *      list_no:
 *        type: "integer"
 *        description: "리스트 인련번호"
 *      operation_code:
 *        type: "string"
 *        description: "수술 케이스명"
 *      operation_name:
 *        type: "string"
 *        description: "수술 명"
 *      operation_date:
 *        type: "string"
 *        description: "수술 일자"
 *      pre_operation:
 *        type: "string"
 *        description: "수술 전 진단"
 *      post_operation:
 *        type: "string"
 *        description: "수술 후 진단"
 *      patient_id:
 *        type: "string"
 *        description: "환자 구분 ID"
 *      patient_name:
 *        type: "string"
 *        description: "환자 이름"
 *      patient_age:
 *        type: "integer"
 *        description: "환자 나이"
 *      patient_sex:
 *        type: "string"
 *        description: "환자 성별"
 *      patient_race:
 *        type: "string"
 *        description: "환자 인종"
 *      index1_count:
 *        type: "integer"
 *        description: "인덱스1 파일 개수"
 *      index2_count:
 *        type: "integer"
 *        description: "인덱스2 파일 개수"
 *      index3_count:
 *        type: "integer"
 *        description: "인덱스3 파일 개수"
 *      clip_count:
 *        type: "integer"
 *        description: "클립 개수"
 *      video_count:
 *        type: "integer"
 *        description: "비디오 파일 개수"
 *      report_count:
 *        type: "integer"
 *        description: "레포트 개수"
 *      status:
 *        type: "string"
 *        description: "레코드 상태 값. Y: 사용가능, T: 휴지통, D: 완전 삭제"
 *      request_status:
 *        type: "string"
 *        description: "요약비디오 요청 상태. Y: 요약비디오 제작 완료, R: 제작요청, N: 요청 안함"
 *      analysis_status:
 *        type: "boolean"
 *        description: "분석 상태 값. Y: 분석완료, R: 분석요청, P: 분석중, N: 분석요청 안함"
 *      is_review:
 *        type: "boolean"
 *        description: "검토 여부"
 *      is_sharing:
 *        type: "boolean"
 *        description: "공유 여부"
 *      is_favorite:
 *        type: "boolean"
 *        description: "즐겨찾기 여부"
 *      origin_video_url:
 *        type: "string"
 *        description: "원본 비디오 URL"
 *      proxy_video_url:
 *        type: "string"
 *        description: "편집기용 비디오 URL"
 *      video_source:
 *        type: "string"
 *        description: "비디오 소스 경로"
 *      reg_date:
 *        type: "string"
 *        description: "수술정보 등록일자"
 *      reg_diff_hour:
 *        type: "integer"
 *        description: "등록 후 지난 시간"
 *      media_info:
 *        $ref: "#definitions/MediaInfo"
 *      video_info:
 *        $ref: "#definitions/VideoInfo"
 *
 *  OperationEditInfo:
 *    type: "object"
 *    description: "수술, 환자 입력, 수정 정보"
 *    properties:
 *      operation_code:
 *        type: "string"
 *        description: "수술 케이스명"
 *      operation_name:
 *        type: "string"
 *        description: "수술 명"
 *      operation_date:
 *        type: "string"
 *        description: "수술 일자"
 *      pre_operation:
 *        type: "string"
 *        description: "수술 전 진단"
 *      post_operation:
 *        type: "string"
 *        description: "수술 후 진단"
 *      patient_id:
 *        type: "string"
 *        description: "환자 구분 ID"
 *      patient_name:
 *        type: "string"
 *        description: "환자 이름"
 *      patient_age:
 *        type: "integer"
 *        description: "환자 나이"
 *      patient_sex:
 *        type: "string"
 *        description: "환자 성별"
 *      patient_race:
 *        type: "string"
 *        description: "환자 인종"
 *      file_size:
 *        type: "integer"
 *        description: "전체 파일 용량"
 *      file_count:
 *        type: "integer"
 *        description: "전체 파일 개수"
 *
 */

export default class OperationInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);

    this.setKeys([
      'seq', 'list_no', 'operation_code', 'operation_name', 'operation_date', 'pre_operation', 'post_operation'
      , 'patient_id', 'patient_name', 'patient_age', 'patient_sex', 'patient_race'
      , 'index1_count', 'index2_count', 'index3_count', 'clip_count', 'video_count', 'report_count'
      , 'status', 'analysis_status', 'request_status', 'is_review', 'is_sharing', 'is_favorite'
      , 'media_info', 'video_info', 'origin_video_url', 'proxy_video_url', 'video_source'
      , 'reg_date', 'reg_diff_hour', 'file_size', 'file_count'
    ]);

    if (data) {
      this.media_info = new MediaInfo().getByOperationInfo(data);

      if (data._no) {
        this.list_no = data._no;
      }

      this.is_review = parseInt(data.is_review) > 0;
      this.is_sharing = parseInt(data.is_sharing) > 0;
      this.is_favorite = parseInt(data.is_favorite) > 0;

      this.reg_diff_hour =  Util.hourDifference(this.reg_date, 'Y-m-d');
      if (this.reg_date) {
        this.reg_date = Util.dateFormat(this.reg_date.getTime());
      }
      if (this.modify_date) {
        this.modify_date = Util.dateFormat(this.modify_date.getTime());
      }

      if (!this.media_info.isEmpty()) {
        this.doctor_name = this.media_info.doctor_name;
      }
    }
  }

  getByRequestBody = (body) => {
    this.setKeys([
      'operation_code', 'operation_name', 'operation_date', 'pre_operation', 'post_operation'
      , 'patient_id', 'patient_name', 'patient_age', 'patient_sex', 'patient_race', 'media_path'
    ]);

    this.setIgnoreEmpty(true);

    if (body != null) {
      this.json_keys.forEach((key) => {
        if (body[key]) {
          this[key] = body[key];
        }
      });
    }

    return this;
  };

  setVideoInfo = (video_info) => {
    this.video_info = video_info;
  };
}
