import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import service_config from '@/config/service.config';

export default class PaymentModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'payment_list';
    this.selectable_fields = ['*'];
  }

  getPaymentList = async (lang) => {
    const result = await this.find({lang: lang});

    return result;
  };
}
