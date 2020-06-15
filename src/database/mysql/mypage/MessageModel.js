import MySQLModel from '../../mysql-model'
import log from "../../../libs/logger";
import StdObject from "../../../wrapper/std-object";

export default class MessageModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'message'
    this.selectable_fields = ['*']
    this.log_prefix = '[MessageModel]'
  }

  getReceiveCount = async(group_seq) => {
    return await this.getTotalCount({ receive_seq: group_seq, is_view: 0 })
  }

  getReceiveList = async (filters, page_navigation) => {
    const select_fields = [
      `${this.table_name}.*`,
      'member.user_id',
      'member.user_nickname',
      ];
    const oKnex = this.database.select(select_fields);
    oKnex.from(this.table_name);
    oKnex.innerJoin('group_info', `${this.table_name}.send_seq`, 'group_info.seq');
    oKnex.innerJoin('member', 'group_info.member_seq', 'member.seq');
    if (filters.query !== undefined) {
      await this.queryWhere(oKnex, filters.query);
    }
    if (filters.order !== undefined) {
      oKnex.orderBy(`${this.table_name}.${filters.order.name}`, filters.order.direction);
    } else {
      oKnex.orderBy(`${this.table_name}.regist_date`,'desc');
    }

    const results = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging);
    if (!results.data || results.data.length === 0) {
      throw new StdObject(-1, '받은 쪽지가 없습니다.', 400);
    }
    return results;
  }

  getSendList = async (filters, page_navigation) => {
    const select_fields = [
      `${this.table_name}.*`,
      'member.user_id',
      'member.user_nickname',
    ];
    const oKnex = this.database.select(select_fields);
    oKnex.from(this.table_name);
    oKnex.innerJoin('group_info', `${this.table_name}.receive_seq`, 'group_info.seq');
    oKnex.innerJoin('member', 'group_info.member_seq', 'member.seq');
    if (filters.query !== undefined) {
      await this.queryWhere(oKnex, filters.query);
    }
    if (filters.order !== undefined) {
      oKnex.orderBy(`${this.table_name}.${filters.order.name}`, filters.order.direction);
    } else {
      oKnex.orderBy(`${this.table_name}.regist_date`,'desc');
    }

    const results = await this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging);
    if (!results.data || results.data.length === 0) {
      throw new StdObject(-1, '받은 쪽지가 없습니다.', 400);
    }
    return results;
  }

  setViewMessage = async (seq) => {
    const param = { seq: seq }
    const updateData = { is_view: 1 }
    return this.update(param, updateData)
  }

  sendMessage = async (message_info) => {
    return this.create(message_info, 'seq')
  }

  deleteMessage = async (seq, flag) => {
    const param = { seq: seq }
    if (flag === 'receive') {
      const updateData = { is_receive_del: 1 }
      return this.update(param, updateData)
    } else {
      const updateData = { is_send_del: 1 }
      return this.update(param, updateData)
    }
  }
}
