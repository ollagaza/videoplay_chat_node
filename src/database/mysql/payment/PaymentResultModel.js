import MySQLModel from '../../mysql-model'

export default class PaymentResultModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[PaymentResultModel]'
  }

  getPaymentCreate = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }

    return await this.create(pg_data);
  };

  getPaymentModify = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }

    pg_data.paid_at = pg_data.paid_at === undefined ? null : this.database.raw(`FROM_UNIXTIME(${pg_data.paid_at})`)
    pg_data.modify_date = this.database.raw('NOW()');
    return await this.update({ merchant_uid: pg_data.merchant_uid }, pg_data);
  };
}
