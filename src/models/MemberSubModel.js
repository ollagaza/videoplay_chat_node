import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import MemberInfo from "@/classes/surgbook/MemberInfo";
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import {MedicalModel} from '@/db/mongodb/model/Medical';
import {InterrestModel} from '@/db/mongodb/model/interrest';
import log from '@/classes/Logger';

export default class MemberSubModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member_sub';
    this.selectable_fields = ['*'];
    this.private_fields = ['regist_date', 'modify_date', 'user_id', 'password', 
    'user_nickname', 'user_name', 'gender', 'email_address', 
    'mail_acceptance', 'birth_day', 'cellphone', 'tel', 
    'user_media_path', 'profile_image_path', 'certkey', 'used', 
    'hospcode', 'hospname', 'treatcode', 'treatname', 
    'etc1', 'etc2', 'etc3', 'etc4', 'etc5'
    ];
  }

  getMemberSubInfo = async (member_seq) => {
    const query_result = await this.findOne({seq: member_seq});
    const member_info = new MemberInfo(query_result);
    member_info.addKey('medical');
    member_info.medical = await MedicalModel.findAll();
    member_info.addKey('interrest');
    member_info.interrest = await InterrestModel.findAll();
    if (!member_info.isEmpty() && !Util.isEmpty(member_info.license_image_path)) {
      member_info.addKey('license_image_url');
      member_info.license_image_url = Util.getUrlPrefix(service_config.get('static_storage_prefix'), member_info.license_image_path);
    }
    return member_info;
  };

  createMember = async (member_seq, member_info) => {
    member_info.seq = member_seq
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    return await this.create(member);
  };

  modifyMember = async (member_seq, member_info) => {
    const query_result = await this.findOne({seq: member_seq});

    member_info.setIgnoreEmpty(true);
    member_info.setAutoTrim(true);

    if (query_result !== undefined) {
      const member = member_info.toJSON();
      return await this.update({seq: member_seq}, member);
    } else {
      member_info.seq = member_seq
      const member = member_info.toJSON();
      return await this.create(member);
    }
  };

  updateProfileImage = async (member_seq, profile_image_path) => {
    return await this.update( { seq: member_seq }, { profile_image_path: profile_image_path } );
  };
}
