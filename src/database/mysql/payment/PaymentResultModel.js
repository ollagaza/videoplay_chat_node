import MySQLModel from '../../mysql-model'

export default class PaymentResultModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[PaymentResultModel]'
  }
}
