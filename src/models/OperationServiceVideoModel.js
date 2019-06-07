import ModelObject from '@/classes/ModelObject';
import OperationServiceVideoInfo from '@/classes/surgbook/OperationServiceVideoInfo';

export default class OperationServiceVideoModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_service_video';
    this.selectable_fields = ['*'];
  }

  createServiceVideo = async (operation_info, sub_content_id) => {
    const create_info = {
      operation_seq: operation_info.seq,
      sub_content_id: sub_content_id
    };
    return await this.create(create_info, 'seq');
  };
}
