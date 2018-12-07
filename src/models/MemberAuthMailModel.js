import ModelObject from '@/classes/ModelObject';

export default class MemberAuthMailModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member_auth_mail';
    this.selectable_fields = ['*'];
  }
}
