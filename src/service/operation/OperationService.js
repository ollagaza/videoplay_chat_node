import service_config from '@/config/service.config';
import querystring from 'querystring';
import semver from 'semver';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import ContentIdManager from '@/classes/ContentIdManager';
import MemberModel from '@/models/MemberModel';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import OperationStorageModel from '@/models/OperationStorageModel';
import OperationShareModel from '@/models/OperationShareModel';
import OperationShareUserModel from '@/models/OperationShareUserModel';
import IndexModel from '@/models/xmlmodel/IndexModel';
import ClipModel from '@/models/xmlmodel/ClipModel';
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';
import ShareTemplate from '@/template/mail/share.template';
import log from "@/classes/Logger";
import {VideoIndexInfoModel, AddVideoIndex} from '@/db/mongodb/model/VideoIndex';
import {OperationMetadataModel} from '@/db/mongodb/model/OperationMetadata';
import {OperationClipModel} from '@/db/mongodb/model/OperationClip';
import {UserDataModel} from '@/db/mongodb/model/UserData';

const getOperationInfo = async (database, operation_seq, token_info) => {
  const operation_model = new OperationModel({ database });
  const operation_info = await operation_model.getOperationInfo(operation_seq, token_info);

  if (operation_info == null || operation_info.isEmpty()) {
    throw new StdObject(-1, '수술 정보가 존재하지 않습니다.', 400);
  }
  if (operation_info.member_seq !== token_info.getId()) {
    if (token_info.getRole() !== roles.ADMIN) {
      throw new StdObject(-99, '권한이 없습니다.', 403);
    }
  }

  return { operation_info, operation_model };
};

const createOperationDirectory = async (operation_info) => {
  const media_directory = operation_info.media_directory;
  const trans_video_directory = Util.getMediaDirectory(service_config.get('trans_video_root'), operation_info.media_path);

  await Util.createDirectory(media_directory + "SEQ");
  await Util.createDirectory(media_directory + "Custom");
  await Util.createDirectory(media_directory + "REF");
  await Util.createDirectory(media_directory + "Thumb");
  await Util.createDirectory(media_directory + "Trash");
  await Util.createDirectory(trans_video_directory + "SEQ");
};

const deleteOperationDirectory = async (operation_info, delete_video = false) => {
  const media_directory = operation_info.media_directory;
  const trans_video_directory = Util.getMediaDirectory(service_config.get('trans_video_root'), operation_info.media_path);

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

const deleteMetaFiles = async (operation_info) => {
  const media_directory = operation_info.media_directory;

  await Util.deleteFile(media_directory + "Index1.xml");
  await Util.deleteFile(media_directory + "Index2.xml");
  await Util.deleteFile(media_directory + "Custom.xml");
  await Util.deleteFile(media_directory + "History.xml");
  await Util.deleteFile(media_directory + "Report.xml");
  await Util.deleteFile(media_directory + "Clip.xml");
};

const deleteOperationFiles = async (operation_info) => {
  const media_directory = operation_info.media_directory;
  const trans_video_directory = Util.getMediaDirectory(service_config.get('trans_video_root'), operation_info.media_path);

  await Util.deleteDirectory(media_directory);
  if (media_directory !== trans_video_directory) {
    await Util.deleteDirectory(deleteOperationFiles);
  }
};

export default {
  getOperationInfo,
  createOperationDirectory,
  deleteOperationDirectory,
  deleteOperationFiles,
  deleteMetaFiles
};
