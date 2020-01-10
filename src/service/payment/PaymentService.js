import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import PaymentModel from '@/models/PaymentModel';
import log from "@/classes/Logger";

const getPaymentList = async (database, lang='Kor') => {
  const payment_model = new PaymentModel({ database });
  const payment_list = await payment_model.getPaymentList(lang);

  return payment_list;
};

export default {
  getPaymentList
};
