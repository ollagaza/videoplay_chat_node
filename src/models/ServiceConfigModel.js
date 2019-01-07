import ModelObject from '@/classes/ModelObject';

export default class ServiceConfigModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'service_config';
    this.selectable_fields = ['*'];
  }
}
