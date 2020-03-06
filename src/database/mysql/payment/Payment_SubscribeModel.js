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

  putSubscribeModify = async (pg_data) => {
    if (typeof pg_data.custom_data !== 'string') {
      pg_data.custom_data = JSON.stringify(pg_data.custom_data);
    }

    pg_data.modify_date = this.database.raw('NOW()');
    return await this.update({ merchant_uid: pg_data.merchant_uid }, pg_data);
  };
}
