import MySQLModel from '../../mysql-model'

export default class HelperModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'service_tutorial'
    this.selectable_fields = ['*']
    this.log_prefix = '[HelperModel]'
  }

  getHelperList = async () => {
    return this.find()
  }

  getHelperInfo = async code => {
    return this.findOne({ code })
  }

  getHelperInfo2 = async code => {
    return this.find(code)
  }

  getSearchResult = async keyword => {
    const oKnex = this.database.select('*')
      .from(this.table_name)
    oKnex.andWhereRaw('MATCH (search_text) AGAINST (? IN BOOLEAN MODE)', keyword)

    return oKnex
  }

  createHelper = async saveData => {
    return this.create(saveData, 'seq')
  }

  updateHelper = async (param, saveData) => {
    return this.update(param, saveData)
  }
}
