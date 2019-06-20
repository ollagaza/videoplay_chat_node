import ModelObject from '@/classes/ModelObject';

export default class SyncOperationQueueModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'sync_operation_queue';
    this.selectable_fields = ['*'];
  }

  createQueue = async (member_seq, key, data) => {
    const create_info = {
      member_seq,
      key,
      "data": JSON.stringify(data)
    };
    return await this.create(create_info, 'seq');
  };
}
