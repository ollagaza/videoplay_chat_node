import _ from 'lodash'
import log from '../../libs/logger'
import Util from '../../utils/Util'
import DBMySQL from '../../database/knex-mysql'
import MemberModel from "../../database/mysql/member/MemberModel"
import GroupModel from '../../database/mysql/group/GroupModel'
import GroupMemberModel from '../../database/mysql/group/GroupMemberModel'
import GroupCountModel from '../../database/mysql/group/GroupCountsModel'
import ContentCountsModel from '../../database/mysql/member/ContentCountsModel'
import GroupGradeModel from '../../database/mysql/group/GroupGradeModel'
import GroupChannelHomeModel from "../../database/mysql/group/GroupChannelHomeModel"
import {OperationClipModel} from '../../database/mongodb/OperationClip'
import ServiceConfig from "../service-config";
import GroupService from "./GroupService";

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
      if (!Util.isEmpty(member_treatlist[cnt])) {
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

  getMyGroupNewNews = async (database, my_group_list, arr_group_seq) => {
    const model = this.getGroupChannelHomeModel(database)
    const result = [];
    for (let cnt = 0; cnt < arr_group_seq.length; cnt++) {
      const group_seq = arr_group_seq[cnt]
      const group_info = _.find(my_group_list, { group_seq })

      const data = await model.getMyGroupNewNews(group_seq)
      if (data.length > 0) {
        result.push({ group_info, data })
      }
    }
    return result
  }

  getRecommendGroupList = async (database, limit) => {
    const model = this.getGroupChannelHomeModel(database)
    const order = [
      { column: 'admin_sort', order: 'asc' },
      { column: 'total_count', order: 'desc' }
    ]

    let group_seqs = await model.getRecommendGroupList(order, limit)
    if (group_seqs.length === 0) {
      group_seqs = await model.getRecommendGroupListOtherDay(order, limit);
    }

    const result = [];
    for (let cnt = 0; cnt < group_seqs.length; cnt++) {
      const group_seq = group_seqs[cnt].group_seq
      const group_info = await model.getRecommendGroupInfo(group_seq)
      if (group_info.profile_image_path) {
        group_info.group_image_url = ServiceConfig.get('static_storage_prefix') + group_info.profile_image_path
      }
      const operation_list = await model.getRecommendOperationList(group_seq, 3)
      for (let v_cnt = 0; v_cnt < operation_list.length; v_cnt++) {
        operation_list[v_cnt].thumbnail = ServiceConfig.get('static_storage_prefix') + operation_list[v_cnt].thumbnail
      }
      const board_list = await model.getRecommendBoardList(group_seq, 3)
      result.push({ group_info, operation_list, board_list })
    }
    return result
  }

  getOpenOperationTop5 = async (database) => {
    const model = this.getGroupChannelHomeModel(database)
    const result = await model.getOpenOperationTop5()
    for (let v_cnt = 0; v_cnt < result.length; v_cnt++) {
      if (result[v_cnt].profile_image_path) {
        result[v_cnt].group_image_url = ServiceConfig.get('static_storage_prefix') + result[v_cnt].profile_image_path
      }
      if (result[v_cnt].thumbnail) {
        result[v_cnt].thumbnail_url = ServiceConfig.get('static_storage_prefix') + result[v_cnt].thumbnail
      }
    }
    return result
  }

  getOpenBoardTop5 = async (database) => {
    const model = this.getGroupChannelHomeModel(database)
    const result = await model.getOpenBoardTop5()
    for (let v_cnt = 0; v_cnt < result.length; v_cnt++) {
      if (result[v_cnt].profile_image_path) {
        result[v_cnt].group_image_url = ServiceConfig.get('static_storage_prefix') + result[v_cnt].profile_image_path
      }
    }
    return result
  }

  getSearchResult = async (database, req, member_seq) => {
    const request_body = req.query ? req.query : {}
    const search_keyword = request_body.search_keyword
    const search_tab = request_body.search_tab
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}

    const paging = {}
    if (search_tab === 'all') {
      paging.list_count = 6
    } else {
      paging.list_count = 10
    }
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = request_paging.no_paging ? request_paging.no_paging : 'N'

    const my_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq, true)

    const model = this.getGroupChannelHomeModel(database)
    const search_group_info = search_tab === 'all' || search_tab === 'group' ? await model.getSearchGroupInfo(search_keyword, search_tab, paging) : null

    if (search_group_info && search_group_info.calc_total_count > 0) {
      const group_info = search_group_info.data;
      for (let cnt = 0; cnt < group_info.length; cnt++) {
        if (group_info[cnt].profile_image_path) {
          group_info[cnt].group_image_url = ServiceConfig.get('static_storage_prefix') + group_info[cnt].profile_image_path
        }
        const operation_list = await model.getRecommendOperationList(group_info[cnt].seq, 3)
        for (let v_cnt = 0; v_cnt < operation_list.length; v_cnt++) {
          if (operation_list[v_cnt].thumbnail) {
            operation_list[v_cnt].thumbnail = ServiceConfig.get('static_storage_prefix') + operation_list[v_cnt].thumbnail
          }
        }
        group_info[cnt].video = operation_list;
      }
    }

    const search_operation_data = search_tab === 'all' || search_tab === 'video' ?  await model.getSearchOperationData(search_keyword, paging) : null
    const search_board_data = search_tab === 'all' || search_tab === 'board' ? await model.getSearchBoardData(search_keyword, paging) : null
    let total_count = 0;

    if (search_operation_data && search_operation_data.data) {
      for (let i = 0; i < search_operation_data.data.length; i++) {
        if (ServiceConfig.get('static_storage_prefix') + search_operation_data.data[i].thumbnail) {
          search_operation_data.data[i].thumbnail_url = ServiceConfig.get('static_storage_prefix') + search_operation_data.data[i].thumbnail
        }
        if (search_operation_data.data[i].profile_image_path) {
          search_operation_data.data[i].group_image_url = ServiceConfig.get('static_storage_prefix') + search_operation_data.data[i].profile_image_path
        }
      }
    }

    if (search_tab === 'all') {
      total_count = search_group_info.calc_total_count + search_operation_data.calc_total_count + search_board_data.calc_total_count
    } else if (search_tab === 'group') {
      total_count = search_group_info.calc_total_count
    } else if (search_tab === 'video') {
      total_count = search_operation_data.calc_total_count
    } else if (search_tab === 'board') {
      total_count = search_board_data.calc_total_count
    }

    return {
      total_count,
      search_group_info,
      search_operation_data,
      search_board_data,
      my_group_list: _.filter(my_group_list, { group_type: 'G', group_open: 1 })
    }
  }

  getCategoryList = async (database, menu_id) => {
    const result = []
    const model = this.getGroupChannelHomeModel(database)
    const group_infos = await this.getCategoryGroupInfo(database, menu_id, 4)

    for (let cnt = 0; cnt < group_infos.length; cnt++) {
      const group_info = group_infos[cnt]
      if (group_info.profile_image_path) {
        group_info.group_image_url = ServiceConfig.get('static_storage_prefix') + group_info.profile_image_path
      }
      const operation_list = await model.getRecommendOperationList(group_info.group_seq, 4)
      for (let v_cnt = 0; v_cnt < operation_list.length; v_cnt++) {
        if (operation_list[v_cnt].thumbnail) {
          operation_list[v_cnt].thumbnail = ServiceConfig.get('static_storage_prefix') + operation_list[v_cnt].thumbnail
        }
      }
      result.push({ group_info, operation_list })
    }

    return result
  }

  getCategoryGroupInfo = async (database, menu_id, limit = null) => {
    const model = this.getGroupChannelHomeModel(database)
    return model.getCategoryGroupInfo(menu_id, limit);
  }

  GroupDataCounting = async () => {
    const model = this.getGroupChannelHomeModel()
    const check_data = await model.checkGroupRecommendCount();
    if (check_data) return false;
    const group_counting = []

    const operation_anotation_count = await OperationClipModel.getGroupSeqCount()
    Object.keys(operation_anotation_count)
      .forEach((item) => {
        const data = _.find(group_counting, {group_seq: operation_anotation_count[item]._id})
        if (data) {
          data.total_count += operation_anotation_count[item].count
          data.video_anotation = operation_anotation_count[item].count
        } else {
          if (operation_anotation_count[item]._id) {
            group_counting.push({
              group_seq: operation_anotation_count[item]._id,
              total_count: operation_anotation_count[item].count,
              video_anotation: operation_anotation_count[item].count
            })
          }
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
