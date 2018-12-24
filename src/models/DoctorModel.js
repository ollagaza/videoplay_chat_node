import ModelObject from '@/classes/ModelObject';

export default class DoctorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'doctor';
    this.selectable_fields = ['*'];
  }
}
