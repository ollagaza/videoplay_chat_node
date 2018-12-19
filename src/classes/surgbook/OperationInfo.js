import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  OperationInfo:
 *    type: "object"
 *    description: "수술, 환자 정보"
 *    properties:
 *      pid:
 *        type: "string"
 *        description: "환자 구분 ID"
 *      patient_name:
 *        type: "string"
 *        description: "환자 이름"
 *      patient_age:
 *        type: "string"
 *        description: "환자 나이"
 *      patient_sex:
 *        type: "string"
 *        description: "환자 성별"
 *      patient_race:
 *        type: "string"
 *        description: "환자 인종"
 *      operation_date:
 *        type: "string"
 *        description: "수술 일자"
 *      operation_name:
 *        type: "string"
 *        description: "수술 명"
 *      pre_operation:
 *        type: "string"
 *        description: "수술 전 진단"
 *      post_operation:
 *        type: "string"
 *        description: "수술 후 진단"
 *
 */

export default class OperationInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);

    this.setKeys(['pid', 'patient_name', 'patient_age', 'patient_sex', 'patient_race', 'operation_date', 'operation_name', 'pre_operation', 'post_operation']);
  }

  setByDoctorInfo = (doctor_info) => {
    if (!doctor_info) {
      return;
    }

    this.pid = doctor_info.PID;
    this.patient_name = doctor_info.PName;
    this.patient_age = doctor_info.Age;
    this.patient_sex = doctor_info.Sex;
    this.patient_race = doctor_info.Race;
    this.operation_date = doctor_info.OpDate;
    this.operation_name = doctor_info.OpName;
    this.pre_operation = doctor_info.PreOperative;
    this.post_operation = doctor_info.PostOperative;
  }

  getQueryJson = () => {
    return {
      "PID": this.pid,
      "PName": this.patient_name,
      "Age": this.patient_age,
      "Sex": this.patient_sex,
      "Race": this.patient_race,
      "OpDate": this.operation_date,
      "OpName": this.operation_name,
      "PreOperative": this.pre_operation,
      "PostOperative": this.post_operation
    }
  }
}
