import Role from '../constants/roles'
import Util from '../utils/baseutil'

export default class TokenInfo {
  constructor (token_info, token, expire_time) {
    this.group_seq = null
    this.service_domain = null
    if (token_info != null) {
      this.id = Util.parseInt(token_info.id) // member table seq
      this.role = Util.parseInt(token_info.role, Role.NONE) // 권한 코드. 나중에 쓸지도 모름.
      this.token = token
      this.expire_time = expire_time
    }
  }

  setTokenByMemberInfo (member_info) {
    this.id = Util.parseInt(member_info.seq, 0) // member table seq
    this.role = Util.parseInt(member_info.role, Role.NONE) // 권한 코드. 나중에 쓸지도 모름.
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

  getExpireTime () {
    return this.expire_time
  }

  isAdmin = () => {
    return this.getRole() === Role.ADMIN
  }

  isMember = () => {
    return this.getRole() === Role.MEMBER
  }

  getLang = () => {
    return this.lang
  }
  setLang = (lang) => {
    this.lang = lang
  }

  getGroupSeq = () => {
    return this.group_seq
  }
  setGroupSeq = (group_seq) => {
    this.group_seq = group_seq
  }

  getServiceDomain = () => {
    return this.service_domain
  }
  setServiceDomain = (service_domain) => {
    this.service_domain = service_domain
  }
}
