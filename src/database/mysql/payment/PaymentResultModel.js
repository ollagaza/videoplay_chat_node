import MySQLModel from '../../mysql-model'

export default class PaymentResultModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[PaymentResultModel]'
  }

  getPaymentResult = async(member_seq, group) => {
    const oKnex = this.database.raw(`
    select list.*, result.*
    from payment_result result
    inner join payment_list list on list.code = json_extract(result.custom_data, '$.code') and list.group = '${group}'
    where result.success = 1
      and buyer_seq = ${member_seq}
      and payment_code != 'free'
      and result.cancelled_at is null
      and date_format(result.paid_at, '%Y%m') between date_format(date_sub(NOW(), interval 6 month), '%Y%m') and date_format(date_add(NOW(), interval 5 month), '%Y%m')
    order by result.paid_at	desc
    `);

    return await oKnex;
  };

  getPaymentLastResult = async(member_seq) => {
    const oKnex = this.database.raw(`
    select result.*
    from payment_result result
    where result.success = 1
      and result.buyer_seq = ${member_seq}
      and result.payment_code != 'free'
      and result.customer_uid is null
    order by result.paid_at	desc
    `);

    return await oKnex;
  }

  createPaymentResultByMemberSeq = async (payData, member_seq) => {
    const create_params = payData;
    create_params.buyer_seq = member_seq;
    create_params.paid_at = this.database.raw('NOW()');

    if (typeof create_params.custom_data !== 'string') {
      create_params.custom_data = JSON.stringify(create_params.custom_data);
    }

    return await this.create(create_params);
  };

  putPaymentCreate = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }
    pg_data.paid_at = pg_data.paid_at === undefined ? null : this.database.raw(`FROM_UNIXTIME(${pg_data.paid_at})`)
    return await this.create(pg_data);
  };

  putPaymentModify = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }

    pg_data.paid_at = pg_data.paid_at === undefined ? null : this.database.raw(`FROM_UNIXTIME(${pg_data.paid_at})`)
    pg_data.cancelled_at = pg_data.cancelled_at === undefined ? null : this.database.raw(`FROM_UNIXTIME(${pg_data.cancelled_at})`)
    pg_data.modify_date = this.database.raw('NOW()');
    return await this.update({ merchant_uid: pg_data.merchant_uid }, pg_data);
  };
}
