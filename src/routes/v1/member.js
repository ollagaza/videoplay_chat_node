import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/member.model';

const routes = Router();

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
