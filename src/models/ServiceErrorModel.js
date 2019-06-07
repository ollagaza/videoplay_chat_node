import ModelObject from '@/classes/ModelObject';
import ServiceErrorInfo from '@/classes/surgbook/ServiceErrorInfo';

export default class ServiceErrorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'service_error';
    this.selectable_fields = ['*'];
  }

  createServiceError = async (error_type, operation_seq, content_id, message) => {
    const error_info = new ServiceErrorInfo({ error_type, operation_seq, content_id, message });
    const create_info = error_info.toJSON();
    return await this.create(create_info, 'seq');
  };
}
