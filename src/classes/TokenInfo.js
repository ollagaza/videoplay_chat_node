import roles from "@/config/roles";

export default class TokenInfo {
  constructor(token_info, token, remain_time) {
    if(token_info != null){
      this.id = token_info.id; // member table seq
      this.role = token_info.role; // 권한 코드. 나중에 쓸지도 모름.
      this.hospital = token_info.hospital;
      this.branch = token_info.branch;
      this.token = token;
      this.remain_time = remain_time;
    }
  }

  setTokenByMemberInfo(member_info) {
    this.id = member_info.seq; // member table seq
    this.role = roles.MEMBER; // 권한 코드. 나중에 쓸지도 모름.
    this.hospital = member_info.hospital_code;
    this.branch = member_info.depart_code;
  }

  getId() {
    return this.id;
  }

  getRole() {
    return this.role;
  }

  getHospital() {
    return this.hospital;
  }

  getBranch() {
    return this.branch;
  }

  getToken() {
    return this.token;
  }

  getRemainTime() {
    return this.remain_time;
  }

  isAdmin = () => {
    return this.getRole() == roles.ADMIN;
  };

  isMember = () => {
    return this.getRole() == roles.ADMIN;
  };
}
