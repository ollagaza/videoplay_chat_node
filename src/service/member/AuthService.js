import log from '../../libs/logger';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService'
import MemberAuthMailModel from '../../database/mysql/member/MemberAuthMailModel';

const AuthServiceClass = class {
  constructor () {
    this.log_prefix = '[AuthServiceClass]'
  }

  login = async (database, req_body) => {
    const result = new StdObject();

    if (!req_body || !req_body.user_id || !req_body.password) {
      throw new StdObject(-1, "아이디 비밀번호를 확인해 주세요.", 400);
    }

    const user_id = req_body.user_id;
    const password = req_body.password;

    const member_info = await MemberService.getMemberInfoById(DBMySQL, user_id)

    if (member_info == null || member_info.user_id !== user_id) {
      throw new StdObject(-1, "등록된 회원 정보가 없습니다.", 400);
    }

    // 임시 프리패스 비밀번호 설정. 데이터 연동 확인 후 삭제
    if (password !== 'dpaxldlwl_!') {
      await MemberService.checkPassword(DBMySQL, member_info, password);
    }

    switch (member_info.used) {
      case 0:
        throw new StdObject(-1, "회원 가입 승인이 완료되지 않았습니다.", 400);
      case 2:
        throw new StdObject(-1, "관리자에 의하여 강제 탈퇴 되었습니다.", 400);
      case 3:
        throw new StdObject(-1, "자발적 탈퇴를 하였습니다..", 400);
      case 4:
        throw new StdObject(-1, "현재 휴면 상태 입니다.", 400);
      case 5:
        throw new StdObject(-1, "현재 사용 중지 중입니다.", 400);
      case 6:
        throw new StdObject(-1, "회원 가입 승인이 거절 되었습니다.<br/>상세한 사항은 이메일을 확인 하여 주시기 바랍니다.", 400);
      case 7:
        throw new StdObject(-1, "회원 가입 승인이 취소 되었습니다.<br/>상세한 사항은 이메일을 확인 하여 주시기 바랍니다.", 400);
      default:
        break;
    }

    return member_info;
  }
}

const auth_service = new AuthServiceClass()

export default auth_service
