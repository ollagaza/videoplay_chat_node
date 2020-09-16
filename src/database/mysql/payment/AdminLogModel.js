import MySQLModel from '../../mysql-model'

export default class AdminLogModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'admin_log'
    this.selectable_fields = ['*']
    this.log_prefix = '[AdminLogModel]'
  }

  getAdminLog = async (merchant_uid, member_seq) => {
    const select_fields = [
      'admin_log.seq',
      this.database.raw('date_format(ifnull(admin_log.modify_date, admin_log.regist_date), \'%Y%m%d %H:%i:%S\') regist_date'),
      'admin_log.log_text',
      'member.user_name',
    ]
    const oKnex = this.database.select(select_fields)
    oKnex.from(this.table_name)
    oKnex.innerJoin('member', function () {
      this.on('member.seq', 'admin_log.admin_seq')
    })
    const filters = {
      is_new: true,
      query: [
        { merchant_uid },
        { member_seq }
      ],
    }
    if (filters.query != undefined) {
      await this.queryWhere(oKnex, filters)
    }
    return oKnex
  }
  Create_AdminLog = async (cu_Param) => {
    const result = await this.create(cu_Param)
    return result
  }
  Update_AdminLog = async (cu_Param) => {
    const searchObj = { seq: cu_Param.seq }
    cu_Param.modify_date = this.database.raw('NOW()')
    delete cu_Param.seq
    const result = await this.update(searchObj, cu_Param)
    return result
  }
  DelAdminLog = async (cu_Param) => {
    const result = await this.delete({ seq: cu_Param.seq })
    return result
  }
}
