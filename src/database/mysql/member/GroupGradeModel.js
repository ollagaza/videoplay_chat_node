import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupInfo from '../../../wrapper/member/GroupInfo'
import log from '../../../libs/logger'

export default class GroupGradeModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_grade'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupGradeModel]'
  }

  getGroupGradeListWithGroupSeq = async (group_seq) => {
    return await this.find({ group_seq })
  }

  insertGroupGrade = async (param) => {
    return await this.create(param)
  }

  updateGroupGrade = async (filter, params) => {
    return await this.update(filter, params)
  }
}
