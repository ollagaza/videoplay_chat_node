import querystring from 'querystring';
import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config';
import Role from '../../constants/roles'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import GroupService from '../member/GroupService'
import OperationFileService from './OperationFileService'
import OperationMediaService from './OperationMediaService'
import CloudFileService from '../cloud/CloudFileService'
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel';
import { VideoIndexInfoModel } from '../../database/mongodb/VideoIndex'
import { OperationMetadataModel } from '../../database/mongodb/OperationMetadata'
import { UserDataModel } from '../../database/mongodb/UserData'
import OperationInfo from '../../wrapper/operation/OperationInfo'

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

  createOperation = async (database, group_member_info, member_seq, operation_data, operation_metadata) => {
    const output = new StdObject();
    let is_success = false;

    const input_operation_data = new OperationInfo().getByRequestBody(operation_data)
    if (input_operation_data.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 없습니다.', 500)
    }
    const operation_info = input_operation_data.toJSON();
    const content_id = Util.getContentId();
    const group_media_path = group_member_info.media_path;
    operation_info.group_seq = group_member_info.group_seq;
    operation_info.member_seq = member_seq;
    operation_info.media_path = `${group_media_path}/operation/${content_id}/`;
    operation_info.created_by_user = 1;
    operation_info.content_id = content_id;

    const operation_model = new OperationModel(database);
    await operation_model.createOperationWithGroup(operation_info);
    if (!operation_info || !operation_info.seq) {
      throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
    }

    await database.transaction(async(transaction) => {
      await OperationMediaService.createOperationMediaInfo(database, operation_info);
      await this.getOperationStorageModel(transaction).createOperationStorageInfo(operation_info);

      output.add('operation_seq', operation_info.seq);

      is_success = true;
    });

    if (is_success) {
      await this.createOperationDirectory(operation_info);

      try {
        await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info);
        await OperationMetadataModel.createOperationMetadata(operation_info, operation_metadata);
        await UserDataModel.updateByMemberSeq(member_seq, { operation_type: operation_info.operation_type });
      } catch (error) {
        log.error(this.log_prefix, '[createOperation]', 'create metadata error', error);
      }
    }
    return output;
  }

  updateOperation = async (database, member_seq, operation_info, request_body) => {
    const operation_seq = operation_info.seq;
    const update_operation_info = new OperationInfo().getByRequestBody(request_body.operation_info);
    if (operation_info.isEmpty()) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400);
    }

    const output = new StdObject();
    await DBMySQL.transaction(async(transaction) => {
      const result = await new OperationModel(transaction).updateOperationInfo(operation_seq, update_operation_info);
      const metadata_result = await OperationMetadataModel.updateByOperationInfo(operation_info, update_operation_info.operation_type, request_body.meta_data);
      if (!metadata_result || !metadata_result._id) {
        throw new StdObject(-1, '수술정보 변경에 실패하였습니다.', 400);
      }
      output.add('result', result);
    });
    try {
      await UserDataModel.updateByMemberSeq(member_seq, { operation_type: update_operation_info.operation_type });
    } catch (error) {
      log.error(this.log_prefix, '[updateOperation]', 'update user_data error', error);
    }
    return output;
  }

  deleteOperation = async (database, token_info, operation_seq) => {
    const { operation_info } = await this.getOperationInfo(database, operation_seq, token_info)
    await this.deleteOperationByInfo(operation_info)
  }

  deleteOperationByInfo = async (operation_info) => {
    DBMySQL.transaction(async(transaction) => {
      const operation_model = this.getOperationModel(transaction)
      await operation_model.deleteOperation(operation_info);
      await GroupService.updateMemberUsedStorage(transaction, operation_info.group_seq, operation_info.member_seq);
    });

    (
      async (operation_info) => {
        try {
          await this.deleteOperationFiles(operation_info)
        } catch (error) {
          log.error(this.log_prefix, '[deleteOperationByInfo]', error)
        }
      }
    )(operation_info)
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

  setMediaInfo = async (database, operation_info) => {
    const media_info = await OperationMediaService.getOperationMediaInfo(database, operation_info)
    operation_info.setMediaInfo(media_info)
  }

  getOperationInfo = async (database, operation_seq, token_info, check_owner= true, import_media_info = false) => {
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

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return { operation_info, operation_model };
  };

  getOperationInfoByContentId = async (database, content_id, import_media_info = false) => {
    const operation_model = this.getOperationModel(database);
    const operation_info = await operation_model.getOperationInfoByContentId(content_id)

    if (import_media_info) {
      await this.setMediaInfo(database, operation_info)
    }

    return { operation_info, operation_model };
  };

  getOperationDirectoryInfo = (operation_info) => {
    const media_path = operation_info.media_path
    const media_directory = ServiceConfig.get('media_root') + media_path;
    const trans_server_root = ServiceConfig.get('trans_server_root')
    const url_prefix = ServiceConfig.get('static_storage_prefix') + media_path
    const cdn_url = ServiceConfig.get('static_cloud_prefix') + media_path
    const content_path = operation_info.content_id + '/'
    return {
      "root": media_directory,
      "origin": media_directory + "origin/",
      "video": media_directory + "video/",
      "other": media_directory + "other/",
      "refer": media_directory + "refer/",
      "image": media_directory + "image/",
      "temp": media_directory + "temp/",
      "media_path": media_path,
      "media_origin": media_path + "origin/",
      "media_video": media_path + "video/",
      "media_other": media_path + "other/",
      "media_refer": media_path + "refer/",
      "media_image": media_path + "image/",
      "media_temp": media_path + "temp/",
      "trans_origin": trans_server_root + media_path + "origin/",
      "trans_video": trans_server_root + media_path + "video/",
      "url_prefix": url_prefix,
      "url_origin": url_prefix + "origin/",
      "url_video": url_prefix + "video/",
      "url_other": url_prefix + "other/",
      "url_refer": url_prefix + "refer/",
      "url_image": url_prefix + "image/",
      "url_temp": url_prefix + "temp/",
      "cdn_prefix": cdn_url,
      "cdn_video": cdn_url + "video/",
      "cdn_other": cdn_url + "other/",
      "cdn_refer": cdn_url + "refer/",
      "cdn_image": cdn_url + "image/",
      "content_path": content_path,
      "content_origin": content_path + "origin/",
      "content_video": content_path + "video/",
      "content_other": content_path + "other/",
      "content_refer": content_path + "refer/",
      "content_image": content_path + "image/",
      "content_temp": content_path + "temp/",
    }
  }

  createOperationDirectory = async (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)

    await Util.createDirectory(directory_info.video);
    await Util.createDirectory(directory_info.other);
    await Util.createDirectory(directory_info.refer);
    await Util.createDirectory(directory_info.image);
    await Util.createDirectory(directory_info.temp);
  };

  deleteOperationDirectory = async (operation_info, delete_video = false) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)

    await Util.deleteDirectory(directory_info.refer);
    await Util.deleteDirectory(directory_info.image);

    if (delete_video) {
      await Util.deleteDirectory(directory_info.video);
      await Util.createDirectory(directory_info.temp);
    }
  };

  deleteOperationFiles = async (operation_info) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    await Util.deleteDirectory(directory_info.root);
    await CloudFileService.requestDeleteFile(directory_info.media_path, true)
  };

  deleteGroupMemberOperations = async (group_seq, member_seq) => {
    log.debug(this.log_prefix, '[deleteGroupMemberOperations]', group_seq, member_seq)
    const operation_model = this.getOperationModel()
    await operation_model.setGroupMemberOperationState(group_seq, member_seq, 'D')
    const operation_list = await operation_model.getGroupMemberOperationList(group_seq, member_seq);

    (
      async (operation_list) => {
        await this.deleteOperationByList(operation_list)
      }
    )(operation_list)
  }

  deleteOperationByList = async (operation_list) => {
    for (let i = 0; i < operation_list.length; i++) {
      const operation_info = operation_list[i]
      try {
        await this.deleteOperationByInfo(operation_info);
      } catch (error) {
        log.debug(this.log_prefix, '[deleteOperationByList]', error)
      }
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

  getVideoIndexList = async (operation_seq) => {
    const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq);
    return video_index_info.index_list ? video_index_info.index_list : [];
  }

  uploadOperationFile = async (database, request, response, operation_info, file_type) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const storage_seq = operation_info.storage_seq;
    let media_directory;
    if (file_type !== OperationFileService.TYPE_REFER) {
      media_directory = directory_info.origin;
    } else {
      media_directory = directory_info.refer;
    }

    if ( !( await Util.fileExists(media_directory) ) ) {
      await Util.createDirectory(media_directory);
    }

    if (file_type === OperationFileService.TYPE_REFER) {
      await Util.uploadByRequest(request, response, 'target', media_directory, Util.getRandomId());
    } else {
      await Util.uploadByRequest(request, response, 'target', media_directory);
    }
    const upload_file_info = request.file;
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }
    upload_file_info.new_file_name = request.new_file_name;

    let upload_seq = null;
    await DBMySQL.transaction(async(transaction) => {
      if (file_type !== OperationFileService.TYPE_REFER) {
        upload_seq = await OperationFileService.createVideoFileInfo(transaction, operation_info, upload_file_info, false);
      } else {
        upload_seq = await OperationFileService.createReferFileInfo(transaction, operation_info, upload_file_info);
      }

      if (!upload_seq) {
        throw new StdObject(-1, '파일 정보를 저장하지 못했습니다.', 500);
      }

      await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type);
      await GroupService.updateMemberUsedStorage(transaction, operation_info.group_seq, operation_info.member_seq)
    });

    return upload_seq
  }

  createOperationVideoThumbnail = async (origin_video_path, operation_info, second = 0) => {
    const directory_info = this.getOperationDirectoryInfo(operation_info)
    const dimension = await Util.getVideoDimension(origin_video_path);
    if (!dimension.error && dimension.width && dimension.height) {
      const thumb_width = Util.parseInt(ServiceConfig.get('thumb_width'), 212);
      const thumb_height = Util.parseInt(ServiceConfig.get('thumb_height'), 160);
      const file_id = Util.getRandomId();
      const thumbnail_file_name = `thumb_${file_id}.png`
      const thumbnail_image_path = `${directory_info.image}${thumbnail_file_name}`

      const get_thumbnail_result = await Util.getThumbnail(origin_video_path, thumbnail_image_path, second, thumb_width, thumb_height)
      if ( get_thumbnail_result.success && ( await Util.fileExists(thumbnail_image_path) ) ) {
        return {
          file_id: file_id,
          file_name: thumbnail_file_name,
          full: thumbnail_image_path,
          path: `${directory_info.media_image}${thumbnail_file_name}`
        }
      } else {
        log.error(this.log_prefix, '[updateTranscodingComplete]', '[Util.getThumbnail]', get_thumbnail_result)
      }
    }
    return null;
  };

  requestAnalysis = async (database, token_info, operation_seq) => {
    let api_request_result = null;
    let is_execute_success = false;
    const { operation_info } = await this.getOperationInfo(database, operation_seq, token_info);
    const directory_info = this.getOperationDirectoryInfo(operation_info)

    await database.transaction(async(transaction) => {
      const operation_model = this.getOperationModel(transaction)
      const operation_update_param = {};
      operation_update_param.analysis_status = 'R';

      const content_id = operation_info.content_id;
      const query_data = {
        "DirPath": directory_info.trans_origin,
        "ContentID": content_id
      };
      const query_str = querystring.stringify(query_data);

      const request_options = {
        hostname: ServiceConfig.get('trans_server_domain'),
        port: ServiceConfig.get('trans_server_port'),
        path: ServiceConfig.get('trans_start_api') + '?' + query_str,
        method: 'GET'
      };
      const api_url = 'http://' + ServiceConfig.get('trans_server_domain') + ':' + ServiceConfig.get('trans_server_port') + ServiceConfig.get('trans_start_api') + '?' + query_str;
      log.debug(this.log_prefix, '[requestAnalysis]', 'trans api url', api_url);
      try {
        api_request_result = await Util.httpRequest(request_options, false);
        is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done';
      } catch (error) {
        log.error(this.log_prefix, '[requestAnalysis]', 'trans api url', api_url, error);
      }

      if (is_execute_success) {
        await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));
      } else {
        throw new StdObject(-1, '비디오 분석 요청 실패', 500);
      }
    });
  }

  isDuplicateOperationCode = async (database, group_seq, member_seq, operation_code) => {
    const operation_model = this.getOperationModel(database)
    return operation_model.isDuplicateOperationCode(group_seq, member_seq, operation_code)
  }

  updateLinkState = async (database, operation_seq, has_link) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateLinkState(operation_seq, has_link)
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
        // const origin_video_directory = operation_info.media_path
        // if (operation_info.trans_video_path) {
        //   const file_size = await Util.getFileSize(operation_info.trans_video_path)
        //   log.debug(this.log_prefix, '[migrationOriginVideoSize]', file_size, operation_info.toJSON())
        //   await operation_storage_model.migrationOriginVideoSize(operation_info.seq, file_size)
        // }
      }
    }
  }

  updateAnalysisStatus = async (database, operation_info, status) => {
    const operation_model = this.getOperationModel(database)
    await operation_model.updateAnalysisStatus(operation_info.seq, status);
  }
}

const operation_service = new OperationServiceClass()

export default operation_service
