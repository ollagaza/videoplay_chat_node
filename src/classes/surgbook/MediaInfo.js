import JsonWrapper from '@/classes/JsonWrapper';

export default class MediaInfo extends JsonWrapper {
  constructor(data, private_keys=[]) {
    super(data, private_keys);
  }
}
