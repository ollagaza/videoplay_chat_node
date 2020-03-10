import MySQLModel from '../../mysql-model'

export default class PaymentModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_list'
    this.selectable_fields = ['*']
    this.log_prefix = '[PaymentModel]'
  }

  getPaymentList = async (lang) => {
    const result = await this.find({ lang: lang, is_visible: 1 });

    return result;
  };
}
