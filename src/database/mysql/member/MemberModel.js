import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'

import MemberInfo from "../../../wrapper/member/MemberInfo";

export default class MemberModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'member'
    this.selectable_fields = ['*']
    this.private_fields = [
      'password', 'user_media_path', 'profile_image_path', 'certkey',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_sub', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text'
    ]
    this.log_prefix = '[MemberModel]'
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
    return new MemberInfo(query_result, this.private_fields);
  };

  getMemberInfoById = async (user_id) => {
    const query_result = await this.findOne({"user_id": user_id});
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime());
    }
    return new MemberInfo(query_result, this.private_fields);
  };

  createMember = async (member_info) => {
    member_info.setAutoTrim(true);
    member_info.password = this.encryptPassword(member_info.password);

    const member = member_info.toJSON();

    member.user_media_path = Constants.SEP + member_info.user_id + Constants.SEP;

    const service_info = ServiceConfig.getServiceInfo();
    const media_root = service_info.media_root;

    if ( !( await Util.fileExists(media_root + member.user_media_path) ) ) {
      await Util.createDirectory(media_root + member.user_media_path);
    }

    const member_seq = await this.create(member, 'seq')
    member_info.addKey('seq')
    member_info.seq = member_seq

    return member_info
  };

  modifyMember = async (member_seq, member_info) => {
    member_info.setIgnoreEmpty(true);
    member_info.setAutoTrim(true);
    if (member_info.password) {
      member_info.password = this.encryptPassword(member_info.password);
    }
    const member = member_info.toJSON();
    const result = await this.update({seq: member_seq}, member);

    return result;
  };

  findMembers = async (searchText) => {
    const find_user_results = await this.find(
      {
        "is_new": true,
        "query": [
          {
            "user_id": ["not", "aaa"],
          },
          {
            "$or": [
              {
                "user_id": ["like", searchText],
              },
              {
                "user_name": ["like", searchText]
              }
            ]
          },
          {
            "used": ["notin", 0, 2, 3, 4, 5],
          }
        ]
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

  leaveMember = async (member_seq) => {
    const update_info = {
      "used": "2",
      "modify_date": this.database.raw('NOW()')
    }
    const result = await this.update({ seq: member_seq }, update_info);
    return result;
  }
}
