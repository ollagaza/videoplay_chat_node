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
      'payment_result.paid_at',
      'payment_result.merchant_uid',
      'member.user_name',
      'member.user_id',
      'payment_result.name',
      this.database.raw('date_add(payment_result.paid_at, interval 1 month) as period'),
      this.database.raw('concat(format(`payment_result`.`amount`, 0), \'원/월 (\', ifnull(json_extract(payment_result.custom_data, \'$.charsu\'), \'\'), \')\') as visit_count'),
      this.database.raw('case payment_result.pay_method when \'card\' then \'카드\' else \'기타\' end pay_method'),
      this.database.raw('case payment_result.status when \'ready\' then \'결제전\'  when \'paid\' then \'결제완료\' when \'cancelled\' then \'결제취소\' else ifnull(payment_result.error_msg, \'결제오류\') end status')
    ];
    const oKnex = this.database.select(select_fields);
    oKnex.from(this.table_name);
    oKnex.innerJoin('member', function() {
      this.on('member.seq', 'payment_result.buyer_seq');
    });
    if (filters.query != undefined) {
      await this.queryWhere(oKnex, filters);
    }
    if (filters.order != undefined) {
      oKnex.orderBy(filters.order.name, filters.order.direction);
    } else {
      oKnex.orderBy('payment_result.paid_at','asc');
    }

    const data = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging);

    return data;
  };

  getOrderInfo = async(merchant_uid) => {
    const oKnex = this.database.raw(`select
      pay_r.paid_at, pay_r.merchant_uid, pay_r.buyer_name, pay_l.name, pay_r.amount, pay_r.name 'order_name',
      case pay_r.pay_method when 'card' then '카드' else '기타' end 'pay_method',
      case pay_r.status when 'ready' then '결제전'  when 'paid' then '결제완료' when 'cancelled' then '결제취소' else ifnull(pay_r.error_msg, '알수없는 오류') end 'text_status',
      mem.user_id, mem.user_type, mem.tel, mem.email_address, mem.cellphone,
      pay_l.moneys, pay_r.status, pay_r.payment_code, pay_r.pay_code, mem.used_admin
      from payment_result pay_r
      inner join payment_list pay_l on pay_l.code = pay_r.payment_code
      inner join \`member\` mem on mem.seq = pay_r.buyer_seq
      where merchant_uid = '${merchant_uid}'`);

    return oKnex;
  };
}
