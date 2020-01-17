import roles from '../constants/roles'
import Util from '../utils/baseutil'

export default class TokenInfo {
  constructor (token_info, token, remain_time) {
    if (token_info != null) {
      this.id = Util.parseInt(token_info.id) // member table seq
      this.role = Util.parseInt(token_info.role, roles.NONE) // 권한 코드. 나중에 쓸지도 모름.
      this.token = token
      this.remain_time = remain_time
    }
  }

  setTokenByMemberInfo (member_info) {
    this.id = Util.parseInt(member_info.seq, 0) // member table seq
    this.role = Util.parseInt(member_info.role, roles.NONE) // 권한 코드. 나중에 쓸지도 모름.
  }

  getId () {
    return this.id
  }

  getRole () {
    return this.role
  }

  getToken () {
    return this.token
  }

  getRemainTime () {
    return this.remain_time
  }

  isAdmin = () => {
    return this.getRole() === roles.ADMIN
  }

  isMember = () => {
    return this.getRole() === roles.MEMBER
  }
}
