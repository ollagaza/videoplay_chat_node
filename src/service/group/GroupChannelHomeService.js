import _ from 'lodash'
import log from '../../libs/logger'
import baseutil from '../../utils/baseutil'
import DBMySQL from '../../database/knex-mysql'
import MemberModel from "../../database/mysql/member/MemberModel"
import GroupModel from '../../database/mysql/group/GroupModel'
import GroupMemberModel from '../../database/mysql/group/GroupMemberModel'
import GroupCountModel from '../../database/mysql/group/GroupCountsModel'
import ContentCountsModel from '../../database/mysql/member/ContentCountsModel'
import GroupGradeModel from '../../database/mysql/group/GroupGradeModel'
import GroupChannelHomeModel from "../../database/mysql/group/GroupChannelHomeModel"
import {OperationClipModel} from '../../database/mongodb/OperationClip'

const GroupChannelHomeServiceClass = class {
  constructor() {
  }

  getMemberModel = (database) => {
    if (database) {
      return new MemberModel(database)
    }
    return new MemberModel(DBMySQL)
  }
  getGroupModel = (database) => {
    if (database) {
      return new GroupModel(database)
    }
    return new GroupModel(DBMySQL)
  }
  getGroupMemberModel = (database) => {
    if (database) {
      return new GroupMemberModel(database)
    }
    return new GroupMemberModel(DBMySQL)
  }
  getGroupCountsModel = (database) => {
    if (database) {
      return new GroupCountModel(database)
    }
    return new GroupCountModel(DBMySQL)
  }
  getContentCountsModel = (database) => {
    if (database) {
      return new ContentCountsModel(database)
    }
    return new ContentCountsModel(DBMySQL)
  }

  getGroupGradeModel = (database) => {
    if (database) {
      return new GroupGradeModel(database)
    }
    return new GroupGradeModel(DBMySQL)
  }

  getGroupChannelHomeModel = (database) => {
    if (database) {
      return new GroupChannelHomeModel(database)
    }
    return new GroupChannelHomeModel(DBMySQL)
  }

  getTreatmentList = async (database) => {
    const model = this.getGroupChannelHomeModel(database)
    const member_treatlist = await model.getGroupOwnerTreatLists()
    const treatlist = []
    for (let cnt = 0; cnt < member_treatlist.length; cnt++) {
      if (!baseutil.isEmpty(member_treatlist[cnt])) {
        try {
          const treat_json = JSON.parse(member_treatlist[cnt].treatcode)
          for (let cnt_sub = 0; cnt_sub < treat_json.length; cnt_sub++) {
            if (!_.find(treatlist, {code: treat_json[cnt_sub].code})) {
              treatlist.push(treat_json[cnt_sub])
            }
          }
        } catch (e) {
        }
      }
    }
    return treatlist
  }

  getMyGroupNewNews = async (database, arr_group_seq) => {
    const model = this.getGroupChannelHomeModel(database)
    const result = await model.getMyGroupNewNews(arr_group_seq)
    return result
  }

  getRecommendGroupList = async (database, limit) => {
    const model = this.getGroupChannelHomeModel(database)
    const order = [
      { column: 'admin_sort', order: 'asc' },
      { column: 'total_count', order: 'desc' }
    ]
    let result = await model.getRecommendGroupList(order, limit)
    if (result.length === 0) {
      result = await model.getRecommendGroupListOtherDay(order, limit);
    }
    return result
  }

  getOpenOperationTop5 = async (database) => {
    const model = this.getGroupChannelHomeModel(database)
    return model.getOpenOperationTop5()
  }

  getOpenBoardTop5 = async (database) => {
    const model = this.getGroupChannelHomeModel(database)
    return model.getOpenBoardTop5()
  }

  GroupDataCounting = async () => {
    const model = this.getGroupChannelHomeModel()
    const check_data = await model.checkGroupRecommendCount();
    if (check_data) return false;
    const group_counting = []

    const operation_anotation_count = await OperationClipModel.getGroupSeqCount()
    Object.keys(operation_anotation_count)
      .forEach((item) => {
        const data = _.find(group_counting, {group_seq: operation_data_count[item].group_seq})
        if (data) {
          data.total_count += operation_data_count[item].count
          data.video_anotation = operation_data_count[item].count
        } else {
          group_counting.push({
            group_seq: operation_anotation_count[item].group_seq,
            total_count: operation_anotation_count[item].count,
            video_anotation: operation_anotation_count[item].count
          })
        }
      })
    const operation_data_count = await model.getOperationCount()
    await Object.keys(operation_data_count)
      .forEach((item) => {
        const data = _.find(group_counting, {group_seq: operation_data_count[item].group_seq})
        if (data) {
          data.total_count += operation_data_count[item].count
          data.video = operation_data_count[item].count
        } else {
          group_counting.push({
            group_seq: operation_data_count[item].group_seq,
            total_count: operation_data_count[item].count,
            video: operation_data_count[item].count
          })
        }
      })
    const operation_comment_count = await model.getOperationCommentCount()
    await Object.keys(operation_comment_count)
      .forEach((item) => {
        const data = _.find(group_counting, {group_seq: operation_comment_count[item].group_seq})
        if (data) {
          data.total_count += operation_comment_count[item].count
          data.video_comment = operation_comment_count[item].count
        } else {
          group_counting.push({
            group_seq: operation_comment_count[item].group_seq,
            total_count: operation_comment_count[item].count,
            video_comment: operation_comment_count[item].count
          })
        }
      })
    const board_data_count = await model.getBoardCount()
    await Object.keys(board_data_count)
      .forEach((item) => {
        const data = _.find(group_counting, {group_seq: board_data_count[item].group_seq})
        if (data) {
          data.total_count += board_data_count[item].count
          data.board = board_data_count[item].count
        } else {
          group_counting.push({
            group_seq: board_data_count[item].group_seq,
            total_count: board_data_count[item].count,
            board: board_data_count[item].count
          })
        }
      })
    const board_comment_count = await model.getBoardCommentCount()
    await Object.keys(board_comment_count)
      .forEach((item) => {
        const data = _.find(group_counting, { group_seq: board_comment_count[item].group_seq })
        if (data) {
          data.total_count += board_comment_count[item].count
          data.board_comment = board_comment_count[item].count
        } else {
          group_counting.push({
            group_seq: board_comment_count[item].group_seq,
            total_count: board_comment_count[item].count,
            board_comment: board_comment_count[item].count
          })
        }
      })

    await model.CreateGroupRecommendListCount(group_counting)
  }
}
const GroupChannelHomeService = new GroupChannelHomeServiceClass()

export default GroupChannelHomeService
