import DBMySQL from '../../database/knex-mysql'
import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'

const getPaymentList = async (database, lang='Kor') => {
  const payment_model = new PaymentModel(DBMySQL);
  const payment_list = await payment_model.getPaymentList(lang);

  return payment_list;
};

const insertPayment = async (database, pg_data) => {
  let result = null;
  const payment_result_model = new PaymentResultModel({ database });
  result = payment_result_model.getPaymentCreate(pg_data);

  return result;
};

const updatePayment = async (database, pg_data) => {
  let result = null;
  const payment_result_model = new PaymentResultModel({ database });
  result = payment_result_model.getPaymentModify(pg_data);

  return result;
};

export default {
  getPaymentList,
  insertPayment,
  updatePayment,
};
