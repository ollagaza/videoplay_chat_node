import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'
import Constant from '../../../constants/constants'

import OperationMediaModel from './OperationMediaModel';
import OperationInfo from '../../../wrapper/operation/OperationInfo';

const join_select = [
  'operation.*', 'member.user_id', 'member.user_name', 'member.user_nickname', 'operation_storage.seq as storage_seq',
  'operation_storage.total_file_size', 'operation_storage.total_file_count', 'operation_storage.clip_count',
  'operation_storage.index2_file_count', 'operation_storage.origin_video_count', 'operation_storage.trans_video_count'
];

export default class OperationModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationModel]'
  }

  getOperationInfoNoJoin = async (operation_seq) => {
    return new OperationInfo(await this.findOne({ seq: operation_seq }))
  }

  getOperation = async (where, import_media_info) => {
    const query = this.database.select(join_select);
    query.from('operation');
    query.innerJoin("member", "member.seq", "operation.member_seq");
    query.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    query.where(where);
    query.first();

    const query_result = await query;

    return await this.getOperationInfoWithMediaInfo(query_result, import_media_info);
  };

  getOperationInfo = async (operation_seq, import_media_info) => {
    const where = {"operation.seq": operation_seq};
    return await this.getOperation(where, import_media_info);
  };

  getOperationInfoListPage = async (group_seq, page_params = {}, filter_params = {}, asc=false)  => {
    const page = page_params.page | 1;
    const list_count = page_params.list_count | 20;
    const page_count = page_params.page_count | 10;

    const query = this.database.select(join_select);
    query.from('operation');
    query.innerJoin("member", "member.seq", "operation.member_seq");
    query.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    query.andWhere('group_seq', group_seq);
    query.whereIn('status', ['Y', 'T']);
    log.debug(this.log_prefix, '[getOperationInfoListPage]', 'filter_params', filter_params)
    if (filter_params.analysis_complete) {
      query.andWhere('is_analysis_complete', Util.isTrue(filter_params.analysis_complete) ? 1 : 0);
    }
    if (filter_params.status) {
      query.andWhere('status', filter_params.status.toUpperCase());
    }
    let check_folder = true;
    if (filter_params.menu) {
      const recent_timestamp = Util.addDay(-(Util.parseInt(filter_params.day, 7)), Constant.TIMESTAMP)
      switch (filter_params.menu) {
        case 'recent':
          query.andWhere('operation.reg_date', '>=', recent_timestamp)
          check_folder = false
          break;
        case 'favorite':
          query.andWhere('is_favorite', 1)
          check_folder = false
          break;
        case 'trash':
          query.andWhere('status', 'T')
          check_folder = false
          break;
      }
    }

    if (filter_params.folder_seq) {
      query.andWhere('folder_seq', Util.parseInt(filter_params.folder_seq, null));
    } else {
      query.whereNull('folder_seq');
    }

    const order_by = {name:'seq', direction: 'DESC'};
    if (asc) {
      order_by.direction = 'ASC';
    }
    query.orderBy(order_by.name, order_by.direction);

    const paging_result = await this.queryPaginated(query, list_count, page, page_count, page_params.no_paging);

    const result = [];

    if (paging_result && paging_result.data) {
      for (const key in paging_result.data) {
        let query_result = paging_result.data[key];
        result.push(this.getOperationInfoByResult(query_result));
      }
    }

    paging_result.data = result;
    return paging_result;
  };

  getOperationInfoListByMember = async (member_seq) => {
    const filters = {
      member_seq,
      status: 'Y',
      is_analysis_complete: 1
    }
    return await this.find(filters, null, { name: "seq", direction: "asc" })
  }

  updateOperationInfo = async (operation_seq, operation_info) => {
    operation_info.setIgnoreEmpty(true);
    const update_params = operation_info.toJSON();
    update_params.modify_date = this.database.raw('NOW()');
    return await this.update({"seq": operation_seq}, update_params);
  };

  getOperationInfoByResult = (query_result) => {
    return new OperationInfo(query_result)
  };

  getOperationInfoWithMediaInfo = async (query_result, import_media_info=false) => {
    if (query_result == null) {
      return new OperationInfo(null);
    }

    const operation_info = this.getOperationInfoByResult(query_result);

    if (import_media_info === true) {
      const media_info = await new OperationMediaModel(this.database).getOperationMediaInfo(operation_info);
      operation_info.setMediaInfo(media_info);
    }

    return operation_info;
  };

  deleteOperation = async (operation_info) => {
    await this.delete({ "seq": operation_info.seq });
  };

  updateStatusTrash = async (operation_seq_list, member_seq, is_delete) => {
    let filters = null
    if (member_seq) {
      filters = { member_seq }
    }
    return await this.updateIn("seq", operation_seq_list, {status: is_delete ? 'Y' : 'T', "modify_date": this.database.raw('NOW()')}, filters);
  };

  updateStatusFavorite = async (operation_seq, is_delete) => {
    return await this.update({"seq": operation_seq}, {is_favorite: is_delete ? 0 : 1, "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {analysis_status: status ? status.toUpperCase() : 'N', "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisComplete = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {is_analysis_complete: status ? 1 : 0, "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisProgress = async (operation_seq, progress) => {
    return await this.update({"seq": operation_seq}, {progress: progress, "modify_date": this.database.raw('NOW()')});
  };

  createOperationWithGroup = async (operation_info) => {
    const operation_seq = await this.create(operation_info, 'seq');
    operation_info.seq = operation_seq;

    return operation_info;
  };

  isDuplicateOperationCode = async (group_seq, member_seq, operation_code) => {
    const where = {"group_seq": group_seq, "member_seq": member_seq, "operation_code": operation_code};
    const total_count = await this.getTotalCount(where);

    return total_count > 0;
  };

  getOperationInfoByContentId = async (content_id) => {
    const where = {"content_id": content_id};
    return await this.getOperation(where, false);
  };

  remove = async (operation_info, member_seq) => {
    const where = {"member_seq": member_seq, "seq": operation_info.seq};
    return await this.delete(where);
  };

  getGroupMemberOperationList = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq
    }
    const operation_list = []
    const query_result = await this.find(filter)
    if (query_result) {
      for (let i = 0; i < query_result.length; i++) {
        operation_list.push(this.getOperationInfoByResult(query_result[i]));
      }
    }
    return operation_list
  }

  setGroupMemberOperationState = async (group_seq, member_seq, status) => {
    const filter = {
      group_seq,
      member_seq
    }
    const params = {
      status,
      "modify_date": this.database.raw('NOW()')
    }
    return await this.update(filter, params);
  }

  getGroupTotalStorageUsedSize = async (group_seq) => {
    const filter = {
      group_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupMemberStorageUsedSize = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupUsedStorageSize = async (filter) => {
    const query = this.database.select([ this.database.raw('SUM(operation_storage.total_file_size) AS total_size') ])
    query.from('operation')
    query.innerJoin("operation_storage", "operation_storage.operation_seq", "operation.seq")
    query.where(filter)
    query.whereIn('status', ['Y', 'T'])
    query.first()

    const query_result = await query
    log.debug(this.log_prefix, '[getGroupUsedStorageSize]', filter, query_result)
    if (!query_result || !query_result.total_size) {
      return 0
    }
    log.debug(this.log_prefix, '[getGroupUsedStorageSize - return]', filter, query_result.total_size, Util.parseInt(query_result.total_size))
    return Util.parseInt(query_result.total_size)
  }

  getOperationListByMemberSeq = async (member_seq) => {
    return await this.find({ member_seq })
  }

  updateLinkState = async (operation_seq, has_link) => {
    return await this.update({"seq": operation_seq}, { has_link: has_link ? 1 : 0, "modify_date": this.database.raw('NOW()') });
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    return await this.update({"member_seq": member_seq}, { group_seq });
  }

  getOperationByFolderSeq = async (group_seq, folder_seq) => {
    return await this.find({ group_seq, folder_seq})
  }

  moveOperationFolder = async (operation_seq, folder_seq) => {
    operation_seq.unshift('in');
    const filters = {
      is_new: true,
      query: [
        { seq: operation_seq },
      ],
    }
    return await this.update(filters, { folder_seq })
  }
}
