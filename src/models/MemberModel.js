import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import MemberInfo from "@/classes/surgbook/MemberInfo";
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import Constants from '@/config/constants';

export default class MemberModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member';
    this.selectable_fields = ['*'];
    this.private_fields = ['password', 'user_media_path', 'profile_image_path', 'certkey'];
  }

  encryptPassword = (password) => {
    if (Util.isEmpty(password)) {
      return null;
    }
    else {
      return Util.hash(`mt_${Util.md5(password)}_eg`);
    }
  };

  getMemberInfo = async (member_seq) => {
    const query_result = await this.findOne({seq: member_seq});
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime());
    }
    const member_info = new MemberInfo(query_result, this.private_fields);
    if (!member_info.isEmpty() && !Util.isEmpty(member_info.profile_image_path)) {
      member_info.addKey('profile_image_url');
      member_info.profile_image_url = Util.getUrlPrefix(service_config.get('static_storage_prefix'), member_info.profile_image_path);
    }
    return member_info;
  };

  createMember = async (member_info) => {
    member_info.setAutoTrim(true);
    member_info.password = this.encryptPassword(member_info.password);

    const member = member_info.toJSON();

    member.user_media_path = Constants.SEP + member_info.user_id + Constants.SEP;

    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;

    if ( !( await Util.fileExists(media_root + member.user_media_path) ) ) {
      await Util.createDirectory(media_root + member.user_media_path);
    }

    return await super.create(member);
  };

  modifyMember = async (member_seq, member_info) => {
    member_info.setIgnoreEmpty(true);
    member_info.setAutoTrim(true);
    member_info.password = this.encryptPassword(member_info.password);
    const member = member_info.toJSON();
    const result = await super.update({seq: member_seq}, member);

    return result;
  };

  findMember = async (member_info) => {
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    const find_user_result = await this.findOne({user_name: member.user_name, email_address: member.email_address, cellphone: member.cellphone});
    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return new MemberInfo(find_user_result);
  };

  findMembers = async (searchText) => {
    const find_user_results = await this.find(
      {
        "is_new": true,
        "is_veryfied": [">", 0],
        "and": {
          "!user_id": "aaa",
          "@or": {
            "%user_id": searchText,
            "%user_name": searchText
          }
        },
        "used": ["notin", 0, 2, 3, 4, 5],
        "seq": [">", 0]
      }
    );

    if (!find_user_results || find_user_results.length === 0) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return new MemberInfo(find_user_results);
  };

  findMemberId = async (member_info) => {
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    const find_user_result = await this.findOne({user_name: member.user_name, email_address: member.email_address});
    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return new MemberInfo(find_user_result);
  };

  findMemberInfo = async (member_info) => {
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    const find_user_result = await this.findOne({user_id: member.user_id, user_name: member.user_name, email_address: member.email_address});
    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return new MemberInfo(find_user_result);
  };

  updateTempPassword = async (member_seq, temp_password) => {
    return await this.update({seq: member_seq}, {password: this.encryptPassword(temp_password)});
  };

  changePassword = async (member_seq, new_password) => {
    return await this.update({seq: member_seq}, {password: this.encryptPassword(new_password)});
  };

  upgradePassword = async (member_seq, new_password) => {
    return await this.update({seq: member_seq}, {password: this.encryptPassword(new_password), "modify_date": this.database.raw('NOW()')});
  };

  updateLastLogin = async (member_seq) => {
    return await this.update({seq: member_seq}, {"modify_date": this.database.raw('NOW()')});
  };

  updateProfileImage = async (member_seq, profile_image_path) => {
    return await this.update( { seq: member_seq }, { profile_image_path: profile_image_path } );
  };

  isDuplicateId = async (user_id) => {
    const where = {"user_id": user_id};
    const total_count = await this.getTotalCount(where);

    return total_count > 0;
  };

  isDuplicateNickname = async (nickname) => {
    const where = {"user_nickname": nickname};
    const total_count = await this.getTotalCount(where);

    return total_count > 0;
  };

  checkPassword = async (member_info, password, db_update = true) => {
    if (member_info.password.length <= 32) {
      if (member_info.password !== Util.md5(password)){
        throw new StdObject(-1, "회원정보가 일치하지 않습니다.", 400);
      }
      if (db_update) {
        await this.upgradePassword(member_info.seq, password);
      }
    } else {
      if (member_info.password !== this.encryptPassword(password)) {
        throw new StdObject(-1, "회원정보가 일치하지 않습니다.", 400);
      }
      if (db_update) {
        await this.updateLastLogin(member_info.seq);
      }
    }
  };
}
