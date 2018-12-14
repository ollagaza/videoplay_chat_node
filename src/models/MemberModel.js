import php from 'phpjs';
import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import MemberInfo from "@/classes/surgbook/MemberInfo";
import Util from '@/utils/baseutil';

export default class MemberModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member';
    this.selectable_fields = ['*'];
    this.private_fields = ['password'];
  }

  create = async (params) => {
    params = {...params, password: php.md5(params.password)};

    // 이메일이 중복되는 경우 409 CONFLICT를 뱉음
    if (await this.findOne({email_address: params.email_address})) {
      throw new StdObject(-1, '중복된 이메일 주소입니다.', 409);
    }

    const member = {
      "user_name": params.user_name,
      "email_address": params.email_address,
      "password": params.password,
      "cellphone": params.cellphone,
      "hospital_code": params.hospital_code,
      "branch_code": params.branch_code,
      "custom_hospital": params.custom_hospital,
      "custom_branch": params.custom_branch,
      "position": params.position,
      "license_no": params.license_no,
      "etc": params.etc
    };
    const result = await super.create(member);

    return result;
  }

  getMemberInfo = async (member_seq) => {
    const member_info = await this.findOne({seq: member_seq});
    if (member_info && member_info.regist_date) {
      member_info.regist_date = Util.dateFormat(member_info.regist_date.getTime());
    }
    return new MemberInfo(member_info, this.private_fields);
  }
}
