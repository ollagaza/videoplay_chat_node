import DBMySQL from '../../database/knex-mysql'
import ServiceConfig from '../../service/service-config';
import Role from '../../constants/roles'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'

import OperationModel from '../../database/mysql/operation/OperationModel';

const OperationServiceClass = class {
  constructor () {}

  getOperationModel = (database = null) => {
    if (database) {
      return new OperationModel(database)
    }
    return new OperationModel(DBMySQL)
  }

  getMediaDirectory = (operation_info) => {
    return operation_info.media_directory;
  }
  getTransVideoDirectory = (operation_info) => {
    return Util.getMediaDirectory(ServiceConfig.get('trans_video_root'), operation_info.media_path);
  }

  getOperationInfo = async (database, operation_seq, token_info) => {
    const operation_model = this.getOperationModel(database);
    const operation_info = await operation_model.getOperationInfo(operation_seq, token_info);

    if (operation_info == null || operation_info.isEmpty()) {
      throw new StdObject(-1, '수술 정보가 존재하지 않습니다.', 400);
    }
    if (operation_info.member_seq !== token_info.getId()) {
      if (token_info.getRole() !== Role.ADMIN) {
        throw new StdObject(-99, '권한이 없습니다.', 403);
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
}

const operation_service = new OperationServiceClass()

export default operation_service
