import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config';
import Role from '../../constants/roles'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel';
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';

const OperationServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationServiceClass]'
  }

  getOperationModel = (database = null) => {
    if (database) {
      return new OperationModel(database)
    }
    return new OperationModel(DBMySQL)
  }

  getOperationStorageModel = (database = null) => {
    if (database) {
      return new OperationStorageModel(database)
    }
    return new OperationStorageModel(DBMySQL)
  }

  getOperationMediaModel = (database = null) => {
    if (database) {
      return new OperationMediaModel(database)
    }
    return new OperationMediaModel(DBMySQL)
  }

  getMediaDirectory = (operation_info) => {
    return operation_info.media_directory;
  }
  getTransVideoDirectory = (operation_info) => {
    return Util.getMediaDirectory(ServiceConfig.get('trans_video_root'), operation_info.media_path);
  }

  getOperationListByRequest = async (database, token_info, request) => {
    const request_query = request.query | {};
    const page_params = {};
    page_params.page = request_query.page
    page_params.list_count = request_query.list_count
    page_params.page_count = request_query.page_count
    page_params.no_paging = request_query.no_paging

    const filter_params = {}
    filter_params.analysis_complete = request_query.analysis_complete
    filter_params.analysis_complete = request_query.status

    return await this.getOperationList(database, token_info.getGroupSeq(), page_params, filter_params)
  }

  getOperationList = async (database, group_seq, page_params = {}, filter_params = {}) => {
    page_params.no_paging = page_params.no_paging | 'n'
    const operation_model = this.getOperationModel(database);
    return await operation_model.getOperationInfoListPage(group_seq, page_params, filter_params)
  }

  getOperationInfo = async (database, operation_seq, token_info, check_owner= true) => {
    const operation_model = this.getOperationModel(database);
    const operation_info = await operation_model.getOperationInfo(operation_seq);

    if (operation_info == null || operation_info.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 존재하지 않습니다.', 400);
    }
    if (check_owner) {
      if (operation_info.member_seq !== token_info.getId()) {
        if (token_info.getRole() !== Role.ADMIN) {
          if (operation_info.group_seq !== token_info.getGroupSeq()) {
            throw new StdObject(-99, '권한이 없습니다.', 403);
          }
        }
      }
    }

    return { operation_info, operation_model };
  };

  createOperationDirectory = async (operation_info) => {
    const media_directory = this.getMediaDirectory(operation_info);
    const trans_video_directory = this.getTransVideoDirectory(operation_info)

    await Util.createDirectory(media_directory + "SEQ");
    await Util.createDirectory(media_directory + "Custom");
    await Util.createDirectory(media_directory + "REF");
    await Util.createDirectory(media_directory + "Thumb");
    await Util.createDirectory(media_directory + "Trash");
    await Util.createDirectory(trans_video_directory + "SEQ");
  };

  deleteOperationDirectory = async (operation_info, delete_video = false) => {
    const media_directory = this.getMediaDirectory(operation_info);
    const trans_video_directory = this.getTransVideoDirectory(operation_info)

    await Util.deleteDirectory(media_directory + "Custom");
    await Util.deleteDirectory(media_directory + "Trash");
    await Util.deleteDirectory(media_directory + "INX1");
    await Util.deleteDirectory(media_directory + "INX2");
    await Util.deleteDirectory(media_directory + "INX3");

    if (delete_video) {
      await Util.deleteDirectory(media_directory + "SEQ");
      await Util.deleteDirectory(trans_video_directory + "SEQ");
    }
  };

  deleteMetaFiles = async (operation_info) => {
    const media_directory = this.getMediaDirectory(operation_info);

    await Util.deleteFile(media_directory + "Index1.xml");
    await Util.deleteFile(media_directory + "Index2.xml");
    await Util.deleteFile(media_directory + "Custom.xml");
    await Util.deleteFile(media_directory + "History.xml");
    await Util.deleteFile(media_directory + "Report.xml");
    await Util.deleteFile(media_directory + "Clip.xml");
  };

  deleteOperationFiles = async (operation_info) => {
    const media_directory = this.getMediaDirectory(operation_info);
    const trans_video_directory = this.getTransVideoDirectory(operation_info)

    await Util.deleteDirectory(media_directory);
    if (media_directory !== trans_video_directory) {
      await Util.deleteDirectory(trans_video_directory);
    }
  };

  deleteGroupMemberOperations = async (group_seq, member_seq) => {
    const operation_model = this.getOperationModel()
    await operation_model.setGroupMemberOperationState(group_seq, member_seq, 'D')
    const operation_list = await operation_model.getGroupMemberOperationList(group_seq, member_seq);

    (
      async () => {
        await this.deleteOperationByList(operation_list)
      }
    )()
  }

  deleteOperationByList = async (operation_list) => {
    for (let i = 0; i < operation_list.length; i++) {
      const operation_info = operation_list[i]
    }
  }

  getGroupTotalStorageUsedSize = async (database, group_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupTotalStorageUsedSize(group_seq)
  }

  getGroupMemberStorageUsedSize = async (database, group_seq, member_seq) => {
    const operation_model = this.getOperationModel(database)
    return await operation_model.getGroupMemberStorageUsedSize(group_seq, member_seq)
  }

  migrationGroupSeq = async (database, member_seq, group_seq) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.migrationGroupSeq(member_seq, group_seq)
  }

  migrationStorageSize = async (database) => {
    const operation_storage_model = this.getOperationStorageModel(database)
    await operation_storage_model.migrationStorageSize()
  }

  migrationTotalFileSize = async (database) => {
    const operation_storage_model = this.getOperationStorageModel(database)
    await operation_storage_model.migrationTotalFileSize()
  }

  migrationOriginVideoSize = async (database, member_seq) => {
    const operation_model = this.getOperationModel(database)
    const operation_storage_model = this.getOperationStorageModel(database)
    const operation_list = await operation_model.getOperationListByMemberSeq(member_seq)
    for (let i = 0; i < operation_list.length; i++) {
      if (operation_list[i].status !== 'D') {
        const operation_info = await operation_model.getOperationInfoWithMediaInfo(operation_list[i], true)
        operation_info.setIgnoreEmpty(true)
        if (operation_info.trans_video_path) {
          const file_size = await Util.getFileSize(operation_info.trans_video_path)
          log.debug(this.log_prefix, '[migrationOriginVideoSize]', file_size, operation_info.toJSON())
          await operation_storage_model.migrationOriginVideoSize(operation_info.seq, file_size)
        }
      }
    }
  }
}

const operation_service = new OperationServiceClass()

export default operation_service
