import ModelObject from '@/classes/ModelObject';
import log from "@/classes/Logger";

export default class Payment_ResultModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'payment_result';
    this.selectable_fields = ['*'];
  }
}
