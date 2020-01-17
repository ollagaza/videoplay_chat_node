import PaymentModel from '../../database/mysql/payment/PaymentModel'
import PaymentResultModel from '../../database/mysql/payment/PaymentResultModel'

const getPaymentList = async (database, lang='Kor') => {
  const payment_model = new PaymentModel({ database });
  const payment_list = await payment_model.getPaymentList(lang);

  return payment_list;
};

export default {
  getPaymentList,
};
