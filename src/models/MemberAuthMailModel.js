import php from 'phpjs';
import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';

export default class MemberAuthMailModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member_auth_mail';
    this.selectable_fields = ['*'];
  }

  getMailAuthKey = async (member_seq, member_email) => {
    const random_val = 10000000 + Math.ceil(Math.random() * 90000000);
    const auth_key = php.md5(random_val);

    const params = {
      "auth_key": auth_key,
      "is_register": 'Y',
      "user_id": member_email,
      "member_seq": member_seq,
      "new_password": '',
      "regdate": Util.currentFormattedDate('yyyymmddHHMMss')
    };

    await super.create(params);
    return auth_key;
  }

  hasAuthMail = async (member_seq, auth_key=null) => {
    const params = {"member_seq": member_seq, "is_register": "Y"};
    if (auth_key != null) {
      params.auth_key = auth_key;
    }
    const total_count = await this.getTotalCount(params);
    return total_count > 0;
  }

  deleteAuthMail = async (member_seq) => {
    return await this.delete({"member_seq": member_seq, "is_register": "Y"});
  }
}
