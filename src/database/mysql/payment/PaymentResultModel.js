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

  getPaymentToDayAmount = async() => {
    const oKnex = this.database.raw('select sum(success_amount) success_amount, \n' +
      '  sum(success_count) success_count,\n' +
      '  sum(cancel_amount) cancel_amount,\n' +
      '  sum(cancel_count) cancel_count\n' +
      'from (select \n' +
      '  case when date_format(cancelled_at, \'%Y%m%d\') is null then ifnull(sum(amount), 0) else 0 end success_amount,\n' +
      '  case when date_format(cancelled_at, \'%Y%m%d\') is null then ifnull(count(amount), 0) else 0 end success_count,\n' +
      '  case when date_format(cancelled_at, \'%Y%m%d\') is not null then ifnull(sum(amount), 0) else 0 end cancel_amount,\n' +
      '  case when date_format(cancelled_at, \'%Y%m%d\') is not null then ifnull(count(amount), 0) else 0 end cancel_count\n' +
      'from payment_result\n' +
      'where payment_code != \'free\'\n' +
      '  and pg_tid is not null\n' +
      '  and success = 1\n' +
      '  and date_format(paid_at, \'%Y%m%d\') = date_format(now(), \'%Y%m%d\')' +
      ') DA');
    return await oKnex;
  };

  getPaymentToMonthAmount = async() => {
    const oKnex = this.database.raw('select sum(success_amount) success_amount, \n' +
      '\tsum(success_count) success_count,\n' +
      '    sum(cancel_amount) cancel_amount,\n' +
      '    sum(cancel_count) cancel_count\n' +
      'from (select \n' +
      '  case when date_format(cancelled_at, \'%Y%m\') is null then ifnull(sum(amount), 0) else 0 end success_amount,\n' +
      '  case when date_format(cancelled_at, \'%Y%m\') is null then ifnull(count(amount), 0) else 0 end success_count,\n' +
      '  case when date_format(cancelled_at, \'%Y%m\') is not null then ifnull(sum(amount), 0) else 0 end cancel_amount,\n' +
      '  case when date_format(cancelled_at, \'%Y%m\') is not null then ifnull(count(amount), 0) else 0 end cancel_count\n' +
      'from payment_result\n' +
      'where payment_code != \'free\'\n' +
      '  and pg_tid is not null\n' +
      '  and success = 1\n' +
      '  and date_format(paid_at, \'%Y%m\') = date_format(now(), \'%Y%m\')\n' +
      'group by date_format(cancelled_at, \'%Y%m\')' +
      ') DA');
    return await oKnex;
  };

  getPaymentChart = async() => {
    const oKnex = this.database.raw('SELECT YYYYMMDD dates,\n' +
      '  cast(date_format(YYYYMMDD, \'%d\') as unsigned) labels,' +
      '  case when date_format(cancelled_at, \'%Y%m\') is null then ifnull(sum(amount), 0) else 0 end success_amount,\n' +
      '  case when date_format(cancelled_at, \'%Y%m\') is not null then ifnull(sum(amount), 0) else 0 end cancel_amount\n' +
      'FROM (SELECT date_format(DT.YYYYMMDD, \'%Y%m%d\') YYYYMMDD\n' +
      '  FROM (SELECT DATE_ADD(NOW(), INTERVAL -(A.A + (10 * B.A)) DAY) YYYYMMDD, A.A AS AA, B.A AS BA\n' +
      '    FROM (SELECT 0 AS A UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS A\n' +
      '    CROSS JOIN (SELECT 0 AS A UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS B\n' +
      ') DT\n' +
      ' WHERE DT.YYYYMMDD BETWEEN date_format(date_sub(now(), interval 19 day), \'%Y%m%d\') AND date_format(date_add(now(), interval 1 day), \'%Y%m%d\')) DT\n' +
      ' LEFT OUTER JOIN payment_result ON date_format(paid_at, \'%Y%m%d\') = DT.YYYYMMDD AND payment_code != \'free\'\n' +
      '  and pg_tid is not null\n' +
      '  and success = 1\n' +
      '  and date_format(paid_at, \'%Y%m\') = date_format(now(), \'%Y%m\')\n' +
      'group by YYYYMMDD\n' +
      'order by YYYYMMDD ASC');
    return await oKnex;
  };

  getPaymentintoMemberList = async(filters, page_navigation) => {
    const select_fields = [
      'payment_result.paid_at', 'payment_result.merchant_uid',
      'member.user_name', 'member.user_id', 'payment_result.name',
      // '\'0(0)\' as period', '\'0\' as visit_count',
      'payment_result.pay_method',
      'payment_result.status'
    ];
    const oKnex = this.database.select(select_fields);
    oKnex.from(this.table_name);
    oKnex.innerJoin('member', function() {
      this.on('member.seq', 'payment_result.buyer_seq');
    });
    if (filters.where != undefined) {
      oKnex.where(filters.where);
    }
    if (filters.order != undefined) {
      oKnex.orderBy(filters.order);
    } else {
      oKnex.orderBy('payment_result.paid_at','asc');
    }

    const data = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging);

    return data;
  };
}
