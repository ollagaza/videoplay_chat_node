import Wrap from "../../utils/express-async";
import StdObject from "../../wrapper/std-object";
import OperationFolderService from "../../service/operation/OperationFolderService";
import DBMySQL from "../../database/knex-mysql";
import TempService from "../../service/TempService";
import {Router} from "express";
import group_service from "../../service/group/GroupService";
import Auth from "../../middlewares/auth.middleware";
import Role from "../../constants/roles";
import GroupModel from "../../database/mysql/group/GroupModel";

const routes = Router()

routes.get('/default_data_setting', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  output.add('group_grade_sync', await group_service.SyncGroupGrade(DBMySQL))
  const group_model = new GroupModel(DBMySQL)
  const group_info_list = await group_model.getAllGroupInfo()
  if (group_info_list && group_info_list.length > 0) {
    for (let i = 0; i < group_info_list.length; i++) {
      await OperationFolderService.syncFolderTotalSize(group_info_list[i].seq)
    }
  }
  output.add('board_linkcode_sync', await TempService.updateBoardLinkCodeSync(DBMySQL))
  output.add('member_treat_code_sync', await TempService.updateMemberTreatCodeSync(DBMySQL))
  output.add('defaultFolderAndBoardMake', await TempService.defaultFolderAndBoardMake(DBMySQL))
  res.json(output)
}))

export default routes
