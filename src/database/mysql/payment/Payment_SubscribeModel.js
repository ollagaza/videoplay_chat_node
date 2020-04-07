import MySQLModel from '../../mysql-model'

export default class Payment_SubscribeModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_subscribe'
    this.selectable_fields = ['*']
    this.log_prefix = '[Payment_SubscribeModel]'
  }

  getAll_subScribe = async () => {
    const oKnex = this.find();
    return await oKnex;
  };

  getSubScribeOne = async (filters) => {
    filters.used = 'Y';
    const oKnex = this.findOne(filters);
    return await oKnex;
  };

  createStand_subScribe = async  (data) => {
    if (typeof data.custom_data !== 'string') {
      data.custom_data = JSON.stringify(data.custom_data);
    }

    await this.create(data);
  };

  putSubscribeCreate = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }

    return await this.create(pg_data);
  };

  SubscribeNotUsedModify = async (old_customer_uid) => {
    const updateData = {
      used: 'N'
    };
    return await this.update({ customer_uid: old_customer_uid }, updateData);
  };

  putSubscribeDelete = async (customer_uid) => {
    return await this.delete({ customer_uid: customer_uid });
  };

  getSubscribeList  = async (member_seq, searchOrder, page_navigation) => {
    const columns = [
      'customer_uid',
      'card_name',
      'card_number',
      'regist_date',
      this.database.raw('case when used = \'Y\' then \'현재결제코드\' else \'이전결제코드\' end used '),
    ];
    return this.findPaginated({ buyer_seq: member_seq }, columns, searchOrder, null, page_navigation);
  };
}
