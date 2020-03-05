import MySQLModel from '../../mysql-model'

export default class Payment_Subscribe_List_Model extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'payment_subscribe_list'
    this.selectable_fields = ['*']
    this.log_prefix = '[Payment_Subscribe_List_Model]'
  }

  getAll_subScribe_list = async () => {
    const oKnex = this.find();
    return await oKnex;
  };

  getComplet_subScribe_list = async () => {
    const oKnex = this.find({ pay_state: 'S' });
    return await oKnex;
  };

  getStand_subScribe_list = async () => {
    const oKnex = this.find({ pay_state: 'N' });
    return await oKnex;
  };

  getPossible_subScribe_list = async () => {
    const oKnex = this.find({ pay_state: 'Y' });
    return await oKnex;
  };

  createStand_subScribe = async  (data) => {
    if (typeof data.custom_data !== 'string') {
      data.custom_data = JSON.stringify(data.custom_data);
    }

    await this.create(data);
  };
}
