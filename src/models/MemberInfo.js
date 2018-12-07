export default class MemberInfo {

  constructor(seq, role) {
    this.seq = seq; // member table seq
    this.role = role; // 권한 코드. 나중에 쓸지도 모름.
  }

  getSeq() {
    return this.seq;
  }

  getRole() {
    return this.role;
  }
}
