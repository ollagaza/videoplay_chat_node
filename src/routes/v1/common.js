import { Router } from 'express';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberModel from '../../database/mysql/member/MemberModel';

const routes = Router();

routes.put('/upload/image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_model = new MemberModel(DBMySQL);
  const member_info = await member_model.getMemberInfo(member_seq);
  const media_root = ServiceConfig.get('media_root');
  const upload_path = member_info.user_media_path + "_upload_" + Constants.SEP + "image";
  const upload_full_path = media_root + upload_path;
  if (!(await Util.fileExists(upload_full_path))) {
    await Util.createDirectory(upload_full_path);
  }

  const new_file_name = Util.getRandomId();
  const upload_file_path = upload_full_path + Constants.SEP + new_file_name;
  await Util.uploadByRequest(req, res, 'image', upload_full_path, new_file_name);
  const upload_file_info = req.file;
  if (Util.isEmpty(upload_file_info) || !(await Util.fileExists(upload_file_path))) {
    log.e(req, 'upload fail', upload_file_info);
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
  }
  const file_type = await Util.getFileType(upload_file_path, new_file_name);
  if (file_type !== 'image') {
    log.e(req, 'file type is not image', upload_file_info, file_type);
    await Util.deleteFile(upload_file_path);
    throw new StdObject(-1, '이미지만 업로드 가능합니다.', 400);
  }
  const image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), upload_path + Constants.SEP + new_file_name);
  const output = new StdObject();
  output.add('image_url', image_url);
  output.add('image_path', upload_path + Constants.SEP + new_file_name);
  res.json(output);
}));

export default routes;
