import php from 'phpjs';
import ModelObject from '@/classes/ModelObject';

export default class MemberModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member';
    this.selectable_fields = [
      'seq', 'regist_date', 'user_name', 'email_address', 
      'cellphone', 'hospital_code', 'branch_code', 'custom_hospital', 
      'custom_branch', 'position', 'license_no', 'etc',
    ];
  }

  async create(params) {
    params = { ...params, password: php.md5(params.password) };

    const result = await super.create(params);

    return result;
  }
}