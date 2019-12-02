import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import MemberInfo from "@/classes/surgbook/MemberInfo";
import log from '@/classes/Logger';

export default class MemberSubModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member_sub';
    this.selectable_fields = ['*'];
  }

  getMemberSubInfo = async (member_seq) => {
    const query_result = await this.findOne({seq: member_seq});
    const member_info = new MemberInfo(query_result);
    return member_info;
  };

  createMember = async (member_info) => {
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    return await super.create(member);
  };

  modifyMember = async (member_seq, member_info) => {
    member_info.setIgnoreEmpty(true);
    member_info.setAutoTrim(true);
    const member = member_info.toJSON();
    const result = await super.update({seq: member_seq}, member);

    return result;
  };

  updateProfileImage = async (member_seq, profile_image_path) => {
    return await this.update( { seq: member_seq }, { profile_image_path: profile_image_path } );
  };
}
