import JsonWrapper from '@/classes/JsonWrapper';
/**
 * @swagger
 * definitions:
 *  UserInfo:
 *    type: "object"
 *    properties:
 *      seq:
 *        type: "integer"
 *        description: "회원 고유 번호"
 *      regist_date:
 *        type: "string"
 *        description: "회원 등록 일자 (yyyy-mm-dd HH:MM:ss)"
 *      user_name:
 *        type: "string"
 *        description: "회원 이름"
 *      email_address:
 *        type: "string"
 *        description: "회원 E-Mail"
 *      cellphone:
 *        type: "string"
 *        description: "회원 연락처"
 *      hospital_code:
 *        type: "string"
 *        description: "병원 코드"
 *      branch_code:
 *        type: "string"
 *        description: "진료과목 코드"
 *      custom_hospital:
 *        type: "string"
 *        description: "직접 입력한 병원 명"
 *      custom_branch:
 *        type: "string"
 *        description: "직접 입력한 진료과목"
 *      position:
 *        type: "string"
 *        description: "직위"
 *      license_no:
 *        type: "string"
 *        description: "면허 번호"
 *      etc:
 *        type: "string"
 *        description: "기타 정보"
 *  UserCreateInfo:
 *    type: "object"
 *    required:
 *    - "user_name"
 *    - "email_address"
 *    - "password"
 *    - "password_confirm"
 *    - "cellphone"
 *    - "hospital_code"
 *    - "branch_code"
 *    - "custom_hospital"
 *    - "custom_branch"
 *    - "position"
 *    - "license_no"
 *    properties:
 *      user_name:
 *        type: "string"
 *        description: "회원 이름"
 *      email_address:
 *        type: "string"
 *        description: "회원 E-Mail"
 *      password:
 *        type: "string"
 *        description: "비밀번호"
 *      password_confirm:
 *        type: "string"
 *        description: "비밀번호 확인"
 *      cellphone:
 *        type: "string"
 *        description: "회원 연락처"
 *      hospital_code:
 *        type: "string"
 *        description: "병원 코드"
 *      branch_code:
 *        type: "string"
 *        description: "진료과목 코드"
 *      custom_hospital:
 *        type: "string"
 *        description: "직접 입력한 병원 명"
 *      custom_branch:
 *        type: "string"
 *        description: "직접 입력한 진료과목"
 *      position:
 *        type: "string"
 *        description: "직위"
 *      license_no:
 *        type: "string"
 *        description: "면허 번호"
 *      etc:
 *        type: "string"
 *        description: "기타 정보"
 *  UserModifyInfo:
 *    type: "object"
 *    required:
 *    - "cellphone"
 *    - "hospital_code"
 *    - "branch_code"
 *    - "custom_hospital"
 *    - "custom_branch"
 *    - "position"
 *    - "license_no"
 *    properties:
 *      user_name:
 *        type: "string"
 *        description: "회원 이름"
 *      email_address:
 *        type: "string"
 *        description: "회원 E-Mail"
 *      password:
 *        type: "string"
 *        description: "비밀번호"
 *      password_confirm:
 *        type: "string"
 *        description: "비밀번호 확인"
 *      cellphone:
 *        type: "string"
 *        description: "회원 연락처"
 *      hospital_code:
 *        type: "string"
 *        description: "병원 코드"
 *      branch_code:
 *        type: "string"
 *        description: "진료과목 코드"
 *      custom_hospital:
 *        type: "string"
 *        description: "직접 입력한 병원 명"
 *      custom_branch:
 *        type: "string"
 *        description: "직접 입력한 진료과목"
 *      position:
 *        type: "string"
 *        description: "직위"
 *      license_no:
 *        type: "string"
 *        description: "면허 번호"
 *      etc:
 *        type: "string"
 *        description: "기타 정보"
 *  UserResetPasswordInfo:
 *    type: "object"
 *    required:
 *    - "user_name"
 *    - "email_address"
 *    - "cellphone"
 *    properties:
 *      user_name:
 *        type: "string"
 *        description: "회원 이름"
 *      email_address:
 *        type: "string"
 *        description: "회원 E-Mail"
 *      cellphone:
 *        type: "string"
 *        description: "회원 연락처"
 *
 */

export default class MemberInfo extends JsonWrapper {
  constructor(data, private_keys=[]) {
    super(data, private_keys);
  }
}
