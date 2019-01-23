import JsonWrapper from '@/classes/JsonWrapper';
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
 *      reg_date:
 *        type: "string"
 *        description: "수술정보 등록일자"
 *      reg_diff_hour:
 *        type: "integer"
 *        description: "등록 후 지난 시간"
 *      content_id:
 *        type: "string"
 *        description: "컨텐츠 아이디"
 *      total_file_size:
 *        type: "integer"
 *        description: "저장공간 사용 량"
 *      total_file_count:
 *        type: "integer"
 *        description: "저장된 파일 개수"
 *      clip_count:
 *        type: "integer"
 *        description: "저장공간 사용 량"
 *      service_video_count:
 *        type: "integer"
 *        description: "저장된 파일 개수"
 *      report_count:
 *        type: "integer"
 *        description: "저장공간 사용 량"
 *      media_info:
 *        $ref: "#definitions/OperationMediaInfo"
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
 *
 */

export default class OperationInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);

    this.setKeys([
      'seq', 'list_no', 'operation_code', 'operation_name', 'operation_date', 'pre_operation', 'post_operation'
      , 'patient_id', 'patient_name', 'patient_age', 'patient_sex', 'patient_race'
      , 'status', 'analysis_status', 'request_status', 'is_review', 'is_sharing', 'is_favorite'
      , 'reg_date', 'reg_diff_hour', 'media_info', 'content_id'
      , 'total_file_size', 'total_file_count', 'clip_count', 'service_video_count', 'report_count'
    ]);

    if (data) {
      if (data._no) {
        this.list_no = data._no;
      }

      this.is_review = parseInt(data.is_review) > 0;
      this.is_sharing = parseInt(data.is_sharing) > 0;
      this.is_favorite = parseInt(data.is_favorite) > 0;

      if (this.reg_date) {
        this.reg_diff_hour =  Util.hourDifference(this.reg_date, 'Y-m-d');
        this.reg_date = Util.dateFormat(this.reg_date.getTime());
      }
      if (this.modify_date) {
        this.modify_date = Util.dateFormat(this.modify_date.getTime());
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

      this.is_empty = false;
    }

    return this;
  };

  setMediaInfo = (media_info) => {
    this.media_info = media_info;
  };
}
