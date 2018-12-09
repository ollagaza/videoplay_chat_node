import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";

const routes = Router();

routes.get('/:id', auth.isAuthenticated(roles.LOGIN_USER), wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = req.params.id;

  if(token_info.getId() != member_seq){
    if(token_info.getRole() == roles.MEMBER){
      return res.json(new StdObject(-1, "잘못된 요청입니다.", 400));
    }
  }

  const member_model = new MemberModel({database});
  const member_info = await member_model.findOne({seq: member_seq});

  // 메니저 권한 도입 시 예시. 병원 또는 부서가 동일한지 체크..
  if(token_info.getRole() == roles.MANAGER){
    if(token_info.getHospital() != member_info.hospital_code || token_info.getBranch() != member_info.branch_code) {
      return res.json(new StdObject(-1, "권한이 없습니다.", 401));
    }
  }

  const output = new StdObject();

  output.add( 'user_name', member_info.user_name );
  output.add( 'email_address', member_info.email_address );
  output.add( 'cellphone', member_info.cellphone );
  output.add( 'hospital_code', member_info.hospital_code );
  output.add( 'branch_code', member_info.branch_code );
  output.add( 'custom_hospital', member_info.custom_hospital );
  output.add( 'custom_branch', member_info.custom_branch );
  output.add( 'position', member_info.position );
  output.add( 'license_no', member_info.license_no );

  res.json(output);
}));

routes.post('/', wrap(async(req, res) => {

  // 커밋과 롤백은 자동임
  await database.transaction(async(trx) => {
    // 트랜잭션 사용해야 하므로 trx를 넘김
    const oMemberModel = new MemberModel({ database: trx });

    // 사용자 삽입
    const seq = await oMemberModel.create(req.body);
    const output = new StdObject();

    output.adds({ seq });

    res.json(output);
  })
}));



export default routes;
