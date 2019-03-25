import ModelObject from '@/classes/ModelObject';

export default class ServiceErrorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'service_error';
    this.selectable_fields = ['*'];
  }

  createServiceError = async (error_type, operation_seq, content_id, message) => {
    const create_info = {};
    create_info.error_type = error_type;
    if (operation_seq) {
      create_info.operation_seq = operation_seq;
    }
    if (content_id) {
      create_info.content_id = content_id;
    }
    if (operation_seq) {
      create_info.message = message;
    }
    return await this.create(create_info, 'seq');
  };
}
