import { Router } from 'express';
import _ from 'lodash';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import DoctorModel from '@/models/DoctorModel';
import database from '@/config/database';
import roles from "@/config/roles";
import MemberModel from '@/models/MemberModel';
import auth from '@/middlewares/auth.middleware';

const routes = Router();

const getMemberQuery = async (token_info) => {
  const member_query = {};
  const member_seq = token_info.getId();

  if (token_info.getRole() == roles.MEMBER) {
    const member_info = await new MemberModel({ database }).findOne({seq: member_seq});
    if (member_info === null) {
      throw new StdObject(-99, '회원 가입 후 사용 가능합니다.');
    }

    member_query.Name = member_info.user_name;
    member_query.Hospital = member_info.hospital_code;
    member_query.Depart = member_info.branch_code;
  }

  return member_query;
}

routes.get('/list', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_query = {};
  if (token_info.getRole() == roles.MEMBER) {
    member_query = await getMemberQuery(token_info);
  }

  const page_query = {};
  if (req.query.page != null) {
    page_query.page = req.query.page;
    if (req.query.list_count != null) {
      page_query.list_count = req.query.list_count;
    }
    if (req.query.page_count != null) {
      page_query.page_count = req.query.page_count;
    }
  }

  const output = new StdObject();

  const doctor_model = new DoctorModel({ database });
  const media_info_page = await doctor_model.getMediaInfoListPage(_.merge(page_query, member_query), null, {name:'ID', direction: 'DESC'});
  output.add('data', media_info_page);

  if (req.query.summary == 'Y') {
    const columns = ["sum(FileNo) as total_file_count", "sum(FileSize) as total_file_size", "sum(RunTime) as total_run_time"];
    const summary_info = await doctor_model.findOne(member_query, columns);
    if (summary_info !== null) {
      output.add('total_file_count', summary_info.total_file_count);
      output.add('total_file_size', summary_info.total_file_size);
      output.add('total_run_time', summary_info.total_run_time);
    }
  }

  res.json(output);
}));

routes.get('/:media_id', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  let member_query = {};
  if (token_info.getRole() == roles.MEMBER) {
    member_query = await getMemberQuery(token_info);
  }

  const media_id = req.params.media_id;
  const media_info = await new DoctorModel({ database }).getMediaInfo(media_id, member_query, true);

  if (media_info == null || media_info.isEmpty()) {
    throw new StdObject(-1, '미디어 정보가 존재하지 않습니다.');
  }

  const output = new StdObject();
  output.adds(media_info.toJson());
  res.json(output);
}));

routes.put('/operation/:media_id', wrap(async(req, res) => {
  req.accepts('application/json');

  const result = await new DoctorModel({ database }).updateOperationInfo(req.params.media_id, req.body);
  console.log(result);

  const output = new StdObject();
  output.add('result', result);

  res.json(output);
}));

export default routes;
