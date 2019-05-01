import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import log from "@/classes/Logger";

const routes = Router();

routes.put('/editor/image', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = Util.parseInt(req.params.member_seq);
  if (token_info.getId() !== member_seq){
    if(token_info.getRole() === roles.MEMBER){
      throw new StdObject(-1, "잘못된 요청입니다.", 403);
    }
  }

  const member_model = new MemberModel({ database });
  const member_info = await member_model.getMemberInfo(member_seq);
  const media_root = service_config.get('media_root');
  const upload_path = member_info.user_media_path + "_upload_\\editor\\image";
  const upload_full_path = media_root + upload_path;
  if (!(await Util.fileExists(upload_full_path))) {
    await Util.createDirectory(upload_full_path);
  }

  const new_file_name = `${Date.now()}_${Util.getRandomString(4)}.png`;
  await Util.uploadByRequest(req, res, 'profile', upload_full_path, new_file_name);
  const upload_file_info = req.file;
  if (Util.isEmpty(upload_file_info)) {
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
  }

  log.d(req, upload_file_info);
  const image_url = Util.getUrlPrefix(service_config.get('static_storage_prefix'), upload_path + '\\' + new_file_name);
  const output = new StdObject();
  output.add('image_url', image_url);
  res.json(output);
}));

export default routes;
