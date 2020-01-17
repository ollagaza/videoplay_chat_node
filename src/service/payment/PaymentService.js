import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import PaymentModel from '@/models/PaymentModel';
import Payment_ResultModel from '@/models/Payment_ResultModel';
import log from "@/classes/Logger";

const getPaymentList = async (database, lang='Kor') => {
  const payment_model = new PaymentModel({ database });
  const payment_list = await payment_model.getPaymentList(lang);

  return payment_list;
};

const insertPayment = async (database, pg_data) => {
  let result = null;
  const payment_resultmodel = new Payment_ResultModel({ database });
  result = payment_resultmodel.getPaymentCreate(pg_data);

  return result;
};

const updatePayment = async (database, pg_data) => {
  let result = null;
  const payment_resultmodel = new Payment_ResultModel({ database });
  result = payment_resultmodel.getPaymentModify(pg_data);

  return result;
};

export default {
  getPaymentList,
  insertPayment,
  updatePayment,
};
