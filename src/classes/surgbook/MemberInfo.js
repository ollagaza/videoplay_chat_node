import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';

/**
 * @swagger
 * definitions:
 *  UserInfo:
 *    type: "object"
 *    description: "회원 정보"
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
 *      depart_code:
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
 *      profile_image_url:
 *        type: "string"
 *        description: "프로필 이미지 URL"
 *  UserCreateInfo:
 *    type: "object"
 *    description: "회원 가입 정보"
 *    required:
 *    - "user_name"
 *    - "email_address"
 *    - "password"
 *    - "password_confirm"
 *    - "cellphone"
 *    - "hospital_code"
 *    - "depart_code"
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
 *      depart_code:
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
 *    description: "변경된 회원정보"
 *    required:
 *    - "cellphone"
 *    - "hospital_code"
 *    - "depart_code"
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
 *      depart_code:
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
 *    description: "회원정보 찾기를 위한 필수정보"
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
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);
  }

  checkEmpty = () => {
    if (this.isEmpty()) {
      return this.returnBoolean(-1, '잘못된 요청입니다.', 400);
    }

    return true;
  };

  checkDefaultParams = () => {
    this.checkEmpty();
    this.checkCellphone();

    if (Util.isEmpty(this.license_no)) {
      return this.returnBoolean(-1, '면허번호를 정확하게 입력하세요.', 400);
    }
    if (Util.isEmpty(this.hospital_code)) {
      return this.returnBoolean(-1, '병원명을 정확하게 입력하세요.', 400);
    }
    if (Util.isEmpty(this.depart_code)) {
      return this.returnBoolean(-1, '진료분야를 정확하게 입력하세요.', 400);
    }
    if (Util.isEmpty(this.position)) {
      return this.returnBoolean(-1, '직위를 정확하게 입력하세요.', 400);
    }
  };

  checkUserName = () => {
    this.checkEmpty();

    if (Util.isEmpty(this.user_name)) {
      return this.returnBoolean(-1, '실명을 정확하게 입력하세요.', 400);
    }
  };

  checkUserId = () => {
    this.checkEmpty();

    if (Util.isEmpty(this.user_id)) {
      return this.returnBoolean(-1, '아이디를 정확하게 입력하세요.', 400);
    }
  };

  checkEmailAddress = () => {
    this.checkEmpty();

    if (Util.isEmpty(this.email_address)) {
      return this.returnBoolean(-1, '이메일 주소를 정확하게 입력하세요.', 400);
    }
  };

  checkPassword = (check_empty=true) => {
    if (check_empty) {
      this.checkEmpty();
    }

    if (check_empty) {
      if (Util.isEmpty(this.password)) {
        return this.returnBoolean(-1, '비밀번호를 정확하게 입력하세요.', 400);
      }
      if (Util.isEmpty(this.password_confirm)) {
        return this.returnBoolean(-1, '비밀번호 확인을 정확하게 입력하세요.', 400);
      }
    }
    else {
      if (Util.isEmpty(this.password) === false) {
        if (Util.isEmpty(this.password_confirm)) {
          return this.returnBoolean(-1, '비밀번호 확인을 정확하게 입력하세요.', 400);
        }
      }
      else {
        return true;
      }
    }

    this.password = Util.trim(this.password);
    this.password_confirm = Util.trim(this.password_confirm);
    if (this.password !== this.password_confirm) {
      return this.returnBoolean(-1, '입력하신 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 400);
    }
  };

  checkCellphone = () => {
    this.checkEmpty();

    if (Util.isEmpty(this.cellphone)) {
      return this.returnBoolean(-1, '휴대폰 번호를 정확하게 입력하세요.', 400);
    }
  };
}
