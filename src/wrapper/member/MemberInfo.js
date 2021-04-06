import JsonWrapper from '../json-wrapper'
import Util from '../../utils/Util'
import ServiceConfig from "../../service/service-config";

export default class MemberInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setUrl()
  }

  setUrl = () => {
    if (this.profile_image_path) {
      this.profile_image_url = ServiceConfig.get('static_storage_prefix') + this.profile_image_path
    } else {
      this.profile_image_url = null;
    }
  }

  checkEmpty = () => {
    if (this.isEmpty()) {
      return this.returnBoolean(-1, '잘못된 요청입니다.', 400)
    }

    return true
  }

  checkDefaultParams = () => {
    this.checkEmpty()
    // this.checkCellphone()
  }

  checkUserId = () => {
    this.checkEmpty()

    if (Util.isEmpty(this.user_id)) {
      return this.returnBoolean(-1, '아이디를 정확하게 입력하세요.', 400)
    }
  }

  checkUserName = () => {
    this.checkEmpty()

    if (Util.isEmpty(this.user_name)) {
      return this.returnBoolean(-1, '실명을 정확하게 입력하세요.', 400)
    }
  }

  checkUserNickname = () => {
    this.checkEmpty()

    if (Util.isEmpty(this.user_nickname)) {
      return this.returnBoolean(-1, '닉네임을 정확하게 입력하세요.', 400)
    }
  }

  // checkCellphone = () => {
  //   this.checkEmpty()
  //
  //   if (Util.isEmpty(this.cellphone)) {
  //     return this.returnBoolean(-1, '휴대전화 번호를 정확하게 입력하세요.', 400)
  //   }
  // }

  checkEmailAddress = () => {
    this.checkEmpty()

    if (Util.isEmpty(this.email_address)) {
      return this.returnBoolean(-1, '이메일 주소를 정확하게 입력하세요.', 400)
    }
  }

  checkPassword = (check_empty = true) => {
    if (check_empty) {
      this.checkEmpty()
    }

    if (check_empty) {
      if (Util.isEmpty(this.password)) {
        return this.returnBoolean(-1, '비밀번호를 정확하게 입력하세요.', 400)
      }
      if (Util.isEmpty(this.password_confirm)) {
        return this.returnBoolean(-1, '비밀번호 확인을 정확하게 입력하세요.', 400)
      }
    } else {
      if (Util.isEmpty(this.password) === false) {
        if (Util.isEmpty(this.password_confirm)) {
          return this.returnBoolean(-1, '비밀번호 확인을 정확하게 입력하세요.', 400)
        }
      } else {
        return true
      }
    }

    this.password = Util.trim(this.password)
    this.password_confirm = Util.trim(this.password_confirm)
    if (this.password !== this.password_confirm) {
      return this.returnBoolean(-1, '입력하신 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 400)
    }
  }
}
