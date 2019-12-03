import JsonWrapper from '@/classes/JsonWrapper';
import Util from '@/utils/baseutil';

export default class MemberInfoSub extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);
  }
}
