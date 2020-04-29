import MySQLModel from '../../mysql-model'

export default class Payment_Member_Result_Model extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_member_result'
    this.selectable_fields = ['*']
    this.log_prefix = '[Payment_Member_Result_Model]'
  }

  getPMResultList = async (member_seq) => {
    const filter = {
      member_seq: member_seq,
      used: 'Y',
    };
    return await this.find(filter);
  }

  getPMRFilterList = async (filters, order) => {
    return await this.find(filters, null, order);
  }

  getPMResultData = async (member_seq = null, merchant_uid = null) => {
    const filter = { };
    if (member_seq != null) {
      filter.member_seq = member_seq;
    }
    if (merchant_uid != null) {
      filter.merchant_uid = merchant_uid;
    }
    filter.used = 'Y';
    return await this.findOne(filter);
  }

  CreatePMResultData = async (payData) => {
    return await this.create(payData, 'seq');
  }

  DeletePMResultData = async (member_seq, merchant_uid) => {
    return await this.update({ member_seq: member_seq, payment_merchant_uid: merchant_uid }, { used: 'N' });
  }
}
