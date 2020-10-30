import MySQLModel from '../../mysql-model'

export default class Payment_Member_Result_Model extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'payment_member_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[Payment_Member_Result_Model]'
  }

  getPMResultList = async (member_seq) => {
    const filter = {
      member_seq: member_seq,
    }
    return await this.find(filter)
  }

  getPMRFilterList = async (filters, order) => {
    return await this.find(filters, null, order)
  }

  getPMResultData = async (member_seq = null, merchant_uid = null) => {
    const filter = {}
    if (member_seq != null) {
      filter.member_seq = member_seq
    }
    if (merchant_uid != null) {
      filter.merchant_uid = merchant_uid
    }
    filter.used = 'Y'
    return await this.findOne(filter)
  }

  CreatePMResultData = async (payData, payDataArray) => {
    const sql = `
      INSERT INTO ${this.table_name} (group_seq, member_seq, payment_merchant_uid, payment_start_date, payment_expire_date, payment_code, pay_code, payment_type, payment_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        payment_merchant_uid = '${payData.payment_merchant_uid}',
        payment_start_date = ${payData.payment_start_date},
        payment_expire_date = ${payData.payment_expire_date},
        payment_code = '${payData.payment_code}',
        pay_code = '${payData.pay_code}',
        payment_type = '${payData.payment_type}',
        payment_count = payment_count + ${payData.payment_count},
        modify_date = current_timestamp()
    `
    const query_result = await this.database.raw(sql, payDataArray)

    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].insertId
    // return await this.create(payData, 'seq')
  }

  DeletePMResultData = async (member_seq, merchant_uid) => {
    const sql = `update payment_member_result pmr,
  (select merchant_uid, '9999-12-31' payment_expire_date, 'free' payment_code, 'free' pay_code, 'once' payment_type
  from payment_result
  where buyer_seq = ?
  and payment_code = 'free') pay
set pmr.payment_merchant_uid = pay.merchant_uid,
  pmr.payment_expire_date = pay.payment_expire_date,
  pmr.payment_code = pay.payment_code,
  pmr.pay_code = pay.pay_code,
  pmr.payment_type = pay.payment_type,
  pmr.payment_count = 1,
  pmr.modify_date = current_timestamp()
where member_seq = ? and payment_merchant_uid = ?`
    const filter = [member_seq, member_seq, merchant_uid]
    return await this.database.raw(sql, filter)
  }
}
