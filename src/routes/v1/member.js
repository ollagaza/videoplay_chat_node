import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import auth from '@/middlewares/auth.middleware';
import role from "@/config/role";

const routes = Router();

routes.get('/', auth.isAuthenticated(role.LOGIN_USER), wrap(async(req, res) => {
  const member_seq = req.member_info.getSeq();

  const member_model = new MemberModel({database});
  const member_info = await member_model.findOne({seq: member_seq});

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
