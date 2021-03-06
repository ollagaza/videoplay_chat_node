import log from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'
import Payment_SubscribeModel from '../../database/mysql/payment/Payment_SubscribeModel'
import Payment_Member_Result_Model from '../../database/mysql/payment/Payment_Member_Result_Model'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'

const PaymentServiceClass = class {
  constructor () {
    this.log_prefix = '[PaymentServiceClass]'
  }

  getPaymentModel = (database = null) => {
    if (database) {
      return new PaymentModel(database)
    }
    return new PaymentModel(DBMySQL)
  }

  getPaymentResultModel = (database = null) => {
    if (database) {
      return new PaymentResultModel(database)
    }
    return new PaymentResultModel(DBMySQL)
  }

  getSubscribeModel = (database = null) => {
    if (database) {
      return new Payment_SubscribeModel(database)
    }
    return new Payment_SubscribeModel(DBMySQL)
  }

  getPayment_Member_Result_Model = (database = null) => {
    if (database) {
      return new Payment_Member_Result_Model(database)
    }
    return new Payment_Member_Result_Model(DBMySQL)
  }

  getPaymentList = async (database, lang = 'Kor') => {
    const payment_model = this.getPaymentModel(database)
    const payment_list = await payment_model.getPaymentList(lang)

    return payment_list
  }

  getPaymentFreeList = async (database, lang = 'Kor') => {
    const payment_model = this.getPaymentModel(database)
    const payment_list = await payment_model.getPaymentFreeList(lang)

    return payment_list
  }

  getPaymentGroupFreeList = async (database, lang = 'Kor') => {
    const payment_model = this.getPaymentModel(database)
    const payment_list = await payment_model.getPaymentGroupFreeList(lang)

    return payment_list
  }

  getPaymentResult = async (database, member_seq, group_type, lang = 'kor') => {
    const output = new StdObject()

    const payment_model = this.getPaymentModel(database)
    const payment_list = await payment_model.getPaymentList(lang, group_type)
    output.add('payment_list', payment_list)

    const payment_result_model = this.getPaymentResultModel(database)
    const payment_result = await payment_result_model.getPaymentResult(member_seq, group_type)
    output.add('payment_result', payment_result[0])

    const PMR_model = this.getPayment_Member_Result_Model(database)
    const PMR_List = await PMR_model.getPMResultList(member_seq)
    output.add('PMR_List', PMR_List)

    return output
  }

  createDefaultPaymentResult = async (database, payData, member_seq, group_info) => {
    const payment_result_model = this.getPaymentResultModel(database)
    const pgData = await payment_result_model.createPaymentResultByMemberSeq(payData, member_seq)
    await this.InsertPMResult(database, member_seq, group_info.seq, payData, JSON.parse(payData.custom_data), JSON.parse(payData.custom_data))
  }

  insertPayment = async (database, pg_data) => {
    let result = null
    const payment_result_model = this.getPaymentResultModel(database)
    result = await payment_result_model.putPaymentCreate(pg_data)

    return result
  }

  updatePayment = async (database, pg_data) => {
    let result = null
    const payment_result_model = this.getPaymentResultModel(database)
    result = await payment_result_model.putPaymentModify(pg_data)

    return result
  }

  insertSubscribe = async (database, pg_data) => {
    let result = null
    const subscribeModel = this.getSubscribeModel(database)
    result = await subscribeModel.putSubscribeCreate(pg_data)

    return result
  }

  usedUpdateSubscribe = async (database, old_customer_uid) => {
    let result = null
    const subscribeModel = this.getSubscribeModel(database)
    result = await subscribeModel.SubscribeNotUsedModify(old_customer_uid)

    return result
  }

  deleteSubscribe = async (database, customer_uid) => {
    let result = null
    const subscribeModel = this.getSubscribeModel(database)
    result = await subscribeModel.putSubscribeDelete(customer_uid)

    return result
  }

  getSubscribe_list = async (database, filters) => {
    let result = null
    return result
  }

  getPaymentLastResult = async (database, filters) => {
    const payment_result_model = this.getPaymentResultModel(database)
    const result = await payment_result_model.getPaymentLastResult(filters)
    return result
  }

  getPosiblePaymentResultList = async (database, member_seq) => {
    const payment_result_model = this.getPaymentResultModel(database)
    const result = await payment_result_model.getPosiblePaymentResultList(member_seq)
    return result
  }

  chkCustomer_uid = async (database, customer_uid) => {
    const subscribeModel = this.getSubscribeModel(database)
    const chkCustomerUid = await subscribeModel.getSubScribeOne({ customer_uid: customer_uid })
    return chkCustomerUid.customer_uid != undefined ? true : false
  }

  getSubScribetoBuyerSeq = async (database, buyer_seq) => {
    const subscribeModel = this.getSubscribeModel(database)
    const subscribe = await subscribeModel.getSubScribeOne({ buyer_seq: buyer_seq })
    return subscribe
  }

  getPMResultList = async (database, member_seq) => {
    const PMResult_Model = this.getPayment_Member_Result_Model(database)
    return await PMResult_Model.getPMResultList(member_seq)
  }

  getPMRFiltertList = async (database, filters, order) => {
    const PMResult_Model = this.getPayment_Member_Result_Model(database)
    return await PMResult_Model.getPMRFilterList(filters, order)
  }

  getPMResultData = async (database, member_seq) => {
    const PMResult_Model = this.getPayment_Member_Result_Model(database)
    return await PMResult_Model.getPMResultData(member_seq)
  }

  InsertPMResult = async (database, member_seq, group_seq, pgData, pay_data, moneys) => {
    try {
      const insertDataObject = {
        group_seq: group_seq,
        member_seq: member_seq,
        payment_merchant_uid: pgData.merchant_uid,
        payment_start_date: database.raw(`date_format(${pgData.paid_at}, '%Y-%m-%d')`),
        payment_expire_date: moneys.code === 'free' ? database.raw(`date_format('9999-12-31', '%Y-%m-%d')`) : database.raw(`date_format(date_add(${pgData.paid_at}, interval 1 ${moneys.pay}), '%Y-%m-%d')`),
        payment_code: pay_data.code,
        pay_code: moneys.paycode,
        payment_type: moneys.paytype,
        payment_count: 1,
      }
      const insertDataArray = [
        group_seq,
        member_seq,
        pgData.merchant_uid,
        database.raw(`date_format(${pgData.paid_at}, '%Y-%m-%d')`),
        moneys.code === 'free' ? database.raw(`date_format('9999-12-31', '%Y-%m-%d')`) : database.raw(`date_format(date_add(${pgData.paid_at}, interval 1 ${moneys.pay}), '%Y-%m-%d')`),
        pay_data.code,
        moneys.paycode,
        moneys.paytype,
        1,
      ]
      await database.transaction(async (transaction) => {
        const PMResult_Model = this.getPayment_Member_Result_Model(transaction)
        const insertResult = await PMResult_Model.CreatePMResultData(insertDataObject, insertDataArray)
        return insertResult
      })
    } catch (e) {
      throw e
    }
  }

  DeletePMResult = async (database, member_seq, merchant_uid) => {
    await database.transaction(async (transaction) => {
      const PMResult_Model = this.getPayment_Member_Result_Model(transaction)
      const deleteResult = await PMResult_Model.DeletePMResultData(member_seq, merchant_uid)
      return deleteResult
    })
  }

  setPaymentFreeStorageAssign = async (database, member_seq, group_seq, setDate) => {
    try {
      const payment_result_Model = this.getPaymentResultModel(database)
      const PMResult_Model = this.getPayment_Member_Result_Model(database)
      const buyerList = (await payment_result_Model.getBuyerSeqAndFreeList(member_seq))[0]

      const setParam = {
        payment_code: setDate.payment_code,
      }

      const setPMRParam = {
        group_seq,
        member_seq,
        payment_merchant_uid: buyerList[0].merchant_uid,
        payment_start_date: setDate.start_date,
        payment_expire_date: setDate.expire_date,
        payment_code: setDate.payment_code,
        pay_code: 'free',
        payment_type: 'once',
        payment_count: '1',
      }

      const updatePaymentResult = await payment_result_Model.setMerchantUidFreeUpdate({ merchant_uid: buyerList[0].merchant_uid }, setParam)
      const insertPMRResult = await PMResult_Model.CreatePMResultData(setPMRParam)

      log.debug(buyerList)
    } catch (e) {
      throw e
    }
  }
}

const payment_service = new PaymentServiceClass()

export default payment_service
