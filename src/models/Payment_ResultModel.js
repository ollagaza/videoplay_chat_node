import ModelObject from '@/classes/ModelObject';
import log from "@/classes/Logger";

export default class Payment_ResultModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'payment_result';
    this.selectable_fields = ['*'];
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
    pg_data.paid_at = this.database.raw(`FROM_UNIXTIME(${pg_data.paid_at})`)
    pg_data.modify_date = this.database.raw('NOW()');
    return await this.update({ merchant_uid: pg_data.merchant_uid }, pg_data);
  };
}
