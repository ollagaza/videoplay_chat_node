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

  createMember = async (params) => {
    // 이메일이 중복되는 경우 409 CONFLICT를 뱉음
    if (await this.findOne({email_address: params.email_address})) {
      throw new StdObject(-1, '중복된 이메일 주소입니다.', 409);
    }

    const member = {
      "user_name": Util.trim(params.user_name),
      "email_address": Util.trim(params.email_address),
      "password": php.md5(params.password),
      "cellphone": Util.trim(params.cellphone),
      "hospital_code": Util.trim(params.hospital_code),
      "branch_code": Util.trim(params.branch_code),
      "custom_hospital": Util.trim(params.custom_hospital),
      "custom_branch": Util.trim(params.custom_branch),
      "position": Util.trim(params.position),
      "license_no": Util.trim(params.license_no)
    };

    if (Util.isEmpty(params.etc) == false) {
      member.etc = params.etc;
    }

    const result = await super.create(member);

    return result;
  }

  modifyMember = async (member_seq, params) => {
    const member = {
      "cellphone": Util.trim(params.cellphone),
      "hospital_code": Util.trim(params.hospital_code),
      "branch_code": Util.trim(params.branch_code),
      "custom_hospital": Util.trim(params.custom_hospital),
      "custom_branch": Util.trim(params.custom_branch),
      "position": Util.trim(params.position),
      "license_no": Util.trim(params.license_no)
    };

    if (Util.isEmpty(params.user_name) == false) {
      member.user_name = params.user_name;
    }
    if (Util.isEmpty(params.email_address) == false) {
      member.email_address = params.email_address;
    }
    if (Util.isEmpty(params.password) == false) {
      member.password = php.md5(params.password);
    }
    if (Util.isEmpty(params.etc) == false) {
      member.etc = params.etc;
    }

    const result = await super.update({seq: member_seq}, member);

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
