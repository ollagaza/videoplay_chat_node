import MySQLModel from '../../mysql-model'

export default class PaymentModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'payment_list'
    this.selectable_fields = ['*']
    this.log_prefix = '[PaymentModel]'
  }

  getPaymentList = async (lang = 'kor', group_type = null) => {
    const searchObj = {
      is_new: true,
      query: [
        { is_visible: 1 },
        { lang: lang }
      ],
    }
    if (group_type) {
      searchObj.query.push({ group: ['in', 'free', group_type] })
    }
    const result = await this.find(searchObj)

    return result
  }

  getPaymentFreeList = async (lang = 'kor') => {
    const oKnex = this.database.select('*')
    oKnex.from(this.table_name)
    oKnex.where(this.database.raw('JSON_EXTRACT(moneys, \'$[0].pay\') = \'free\''))

    return oKnex
  }

  getPaymentGroupFreeList = async (lang = 'kor') => {
    const oKnex = this.database.select('*')
    oKnex.from(this.table_name)
    oKnex.where(this.database.raw('JSON_EXTRACT(moneys, \'$[0].pay\') = \'free\''))
    oKnex.andWhere('group', 'hospital');
    return oKnex
  }
}
