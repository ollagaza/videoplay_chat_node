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

  encryptPassword = (password) => {
    if (Util.isEmpty(password)) {
      return null;
    }
    else {
      return php.md5(password);
    }
  }

  getMemberInfo = async (member_seq) => {
    const query_result = await this.findOne({seq: member_seq});
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime());
    }
    return new MemberInfo(query_result, this.private_fields);
  }

  createMember = async (member_info) => {
    // 이메일이 중복되는 경우 409 CONFLICT를 뱉음
    if (await this.findOne({email_address: member_info.email_address})) {
      throw new StdObject(-1, '중복된 이메일 주소입니다.', 409);
    }

    member_info.setAutoTrim(true);
    member_info.password = this.encryptPassword(member_info.password);

    const member = member_info.toJSON();

    let user_media_path = "\\";
    if (!member_info.hospital_code || member_info.hospital_code === 'XXXX') {
      user_media_path += "C_" + Util.getRandomString(5).toUpperCase() + "\\";
    } else {
      user_media_path += member_info.hospital_code.toUpperCase() + "\\";
    }
    if (!member_info.depart_code || member_info.depart_code === 'ZZZ') {
      user_media_path += "C_" + Util.getRandomString(4).toUpperCase() + "\\";
    } else {
      user_media_path += member_info.depart_code.toUpperCase() + "\\";
    }
    user_media_path += member_info.user_name + "\\";
    member.user_media_path = user_media_path;

    const result = await super.create(member);

    return result;
  }

  modifyMember = async (member_seq, member_info) => {
    member_info.setIgnoreEmpty(true);
    member_info.setAutoTrim(true);
    member_info.password = this.encryptPassword(member_info.password);
    const member = member_info.toJSON();
    const result = await super.update({seq: member_seq}, member);

    return result;
  }

  findMember = async (member_info) => {
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    const find_user_result = await this.findOne({user_name: member.user_name, email_address: member.email_address, cellphone: member.cellphone});
    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return new MemberInfo(find_user_result);
  }

  updateTempPassword = async (member_seq, temp_password) => {
    return await this.update({seq: member_seq}, {password: this.encryptPassword(temp_password)});
  }

  getBannerNewUserList = async (list_count) => {
    const columns = [
      "member.user_name", "member.hospital_code", "member.depart_code"
      , "if(member.hospital_code = 'XXXX', member.custom_hospital, hospital.name) as hostital_name"
      , "if(member.depart_code = 'ZZZ', member.custom_branch, depart.name) as depart_name"
    ];
    const oKnex = this.database.select(this.arrayToSafeQuery(columns));
    oKnex.from(this.table_name);
    oKnex.innerJoin("hospital", "hospital.code", "member.hospital_code");
    oKnex.innerJoin("depart", "depart.code", "member.depart_code");
    oKnex.where(this.database.raw("email_address not like '%@mteg%' and email_address not LIKE '%test%'"));
    oKnex.orderBy('member.seq', 'desc');
    oKnex.limit(list_count);

    return await oKnex;
  }
}
