import request from 'request-promise'
import util from '../../utils/Util'
import Service_Config from '../service-config'
import StdObject from '../../wrapper/std-object'

const IamportApiServiceClass = class {
  constructor () {
    this.log_prefix = '[PaymentServiceClass]'
  }

  setMakeOrderNum () {
    const nowDate = new Date()
    const year = nowDate.getFullYear()
    const month = (nowDate.getMonth() + 1) < 10 ? `0${(nowDate.getMonth() + 1)}` : (nowDate.getMonth() + 1)
    const day = nowDate.getDate() < 10 ? `0${nowDate.getDate()}` : nowDate.getDate()

    return `ORDER_${year}${month}${day}_${util.getRandomNumber()}`
  }

  makePayData (subScribeResult, pg_data) {
    return {
      pg: subScribeResult.response.pg_id,
      pay_method: subScribeResult.response.pay_method,
      merchant_uid: subScribeResult.response.merchant_uid,
      customer_uid: pg_data.customer_uid,
      name: subScribeResult.response.name,
      currency: subScribeResult.response.currency,
      amount: subScribeResult.response.amount,
      buyer_seq: pg_data.buyer_seq,
      buyer_email: pg_data.buyer_email,
      buyer_name: pg_data.buyer_name,
      buyer_tel: pg_data.buyer_tel,
      buyer_addr: pg_data.buyer_addr,
      buyer_postcode: pg_data.buyer_postcode,
      custom_data: pg_data.custom_data,
      payment_code: pg_data.payment_code,
      pay_code: pg_data.pay_code,
      imp_uid: subScribeResult.response.imp_uid,
      pg_tid: subScribeResult.response.pg_tid,
      apply_num: subScribeResult.response.apply_num,
      status: subScribeResult.response.status,
      success: subScribeResult.code === 0 ? 1 : 0,
      error_code: subScribeResult.code,
      error_msg: subScribeResult.response.fail_reason,
      pg_provider: subScribeResult.response.pg_provider,
      paid_at: subScribeResult.response.paid_at,
      receipt_url: subScribeResult.response.receipt_url,
      card_name: subScribeResult.response.card_name,
      bank_name: '',
      vbank_num: '',
      vbank_name: '',
      vbank_holder: '',
      vbank_date: null,
    }
  }

  getIamportToken = async () => {
    const access_token = {
      code: 0,
      message: '',
      token: '',
    }
    const Options = {
      headers: {
        'Content-Type': 'application/json',
      },
      url: 'https://api.iamport.kr/users/getToken',
      method: 'POST',
      form: {
        imp_key: Service_Config.get('import_api_key'),
        imp_secret: Service_Config.get('import_api_secret'),
      },
      json: true
    }
    try {
      await request(Options)
        .then(({ code, message, response }) => {
          if (code === 0) {
            access_token.token = response.access_token
          } else {
            access_token.code = code
            access_token.message = message
            access_token.token = ''
          }
        })
      return access_token
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }

  subScribePayment = async (pg_data) => {
    const access_token = await this.getIamportToken()

    const Options = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': access_token.token,
      },
      url: 'https://api.iamport.kr/subscribe/payments/again',
      method: 'POST',
      form: {
        customer_uid: pg_data.customer_uid,
        merchant_uid: this.setMakeOrderNum(),
        amount: pg_data.amount,
        name: pg_data.name,
      },
      json: true
    }
    try {
      const result = {}
      await request(Options)
        .then(({ code, message, response }) => {
          if (code === 0) {
            result.code = code
            result.message = message
            result.response = response
          } else {
            result.code = code
            result.message = message
            result.response = null
          }
        })
      return result
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }

  subScribeDelete = async (customer_uid) => {
    const access_token = await this.getIamportToken()

    const Options = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': access_token.token,
      },
      url: `https://api.iamport.kr/subscribe/customers/${customer_uid}`,
      method: 'DELETE',
      json: true
    }
    const result = {}
    try {
      await request(Options)
        .then(({ code, message, response }) => {
          result.code = code
          result.message = message
          result.response = response
        })
      return result
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }

  paymentCancel = async (last_data, reason_text, cancel_type) => {
    try {
      const access_token = await this.getIamportToken()
      const diffDay = util.dayDiffenrence(last_data.paid_at)
      let amount = 0

      if (diffDay > 7) {
        if (cancel_type === 'C') {
          amount = (last_data.amount / (31 - diffDay))
        } else {
          amount = ((last_data.amount / (31 - diffDay)) / 30) * 0.7
        }
        amount = Math.ceil(Math.ceil(amount / 10) * 10)
      } else {
        amount = last_data.amount
      }
      const Options = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': access_token.token,
        },
        method: 'POST',
        url: 'https://api.iamport.kr/payments/cancel',
        form: {
          imp_uid: last_data.imp_uid,
          merchant_uid: last_data.merchant_uid,
          amount: amount,
          tax_free: 0,
          checksum: null,
          reason: reason_text,
          refund_holder: '',
          refund_bank: '',
          refund_account: '',
        },
        json: true
      }

      const result = {}
      await request(Options)
        .then(({ code, message, response }) => {
          result.code = code
          result.message = message
          result.response = response
        })
      return result
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }

  adminPaymentCancel = async (data, amount) => {
    try {
      const access_token = await this.getIamportToken()

      const Options = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': access_token.token,
        },
        method: 'POST',
        url: 'https://api.iamport.kr/payments/cancel',
        form: {
          imp_uid: data.imp_uid,
          merchant_uid: data.merchant_uid,
          amount: amount,
          tax_free: 0,
          checksum: null,
          reason: '????????? ????????????',
          refund_holder: '',
          refund_bank: '',
          refund_account: '',
        },
        json: true
      }

      const result = {}
      await request(Options)
        .then(({ code, message, response }) => {
          result.code = code
          result.message = message
          result.response = response
        })
      return result
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }

  getSubscripbeInfo = async (customer_uid) => {
    try {
      const access_token = await this.getIamportToken()

      const Options = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': access_token.token,
        },
        method: 'GET',
        url: `https://api.iamport.kr/subscribe/customers?customer_uid[]=${customer_uid}`,
        form: {
          customer_uid: [
            customer_uid
          ],
        },
        json: true
      }

      const result = {}
      await request(Options)
        .then(({ code, message, response }) => {
          result.code = code
          result.message = message
          result.response = response
        })
      return result
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }
}

const IamportApi_service = new IamportApiServiceClass()

export default IamportApi_service
