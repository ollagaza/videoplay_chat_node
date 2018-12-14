import JsonWrapper from '@/classes/JsonWrapper';

export default class MemberInfo extends JsonWrapper {
  constructor(data, private_keys=[]) {
    super(data, private_keys);
  }
}
