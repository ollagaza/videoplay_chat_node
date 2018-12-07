import php from 'phpjs';
import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';

export default class MemberModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member';
    this.selectable_fields = ['*'];
  }

  async create(params) {
    params = { ...params, password: php.md5(params.password) };

    // 이메일이 중복되는 경우 409 CONFLICT를 뱉음
    const { email_address } = params;
    if (await this.findOne({ email_address }))
      throw new StdObject(-1, '중복된 이메일 주소입니다.', 409);

    const result = await super.create(params);

    return result;
  }
}
