import role from "@/config/roles";

export default class TokenInfo {
  constructor(tonek_info) {
    if(tonek_info != null){
      this.id = tonek_info.id; // member table seq
      this.role = tonek_info.role; // 권한 코드. 나중에 쓸지도 모름.
      this.hospital = tonek_info.hospital;
      this.branch = tonek_info.branch;
    }
  }

  setTokenByMemberInfo(member_info) {
    this.id = member_info.seq; // member table seq
    this.role = role.MEMBER; // 권한 코드. 나중에 쓸지도 모름.
    this.hospital = member_info.hospital_code;
    this.branch = member_info.branch_code;
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
}
