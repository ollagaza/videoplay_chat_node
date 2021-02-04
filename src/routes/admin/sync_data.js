import Wrap from "../../utils/express-async";
import StdObject from "../../wrapper/std-object";
import OperationFolderService from "../../service/operation/OperationFolderService";
import DBMySQL from "../../database/knex-mysql";
import TempService from "../../service/TempService";
import {Router} from "express";
import group_service from "../../service/group/GroupService";

const routes = Router()

routes.get('/default_data_setting', Wrap(async (req, res) => {
  const output = new StdObject()
  output.add('group_grade_sync', await group_service.SyncGroupGrade(DBMySQL))
  output.add('folder_size_sync', await OperationFolderService.SyncFolderTotalSize(DBMySQL))
  output.add('board_linkcode_sync', await TempService.updateBoardLinkCodeSync(DBMySQL))
  output.add('member_treat_code_sync', await TempService.updateMemberTreatCodeSync(DBMySQL))
  output.add('defaultFolderAndBoardMake', await TempService.defaultFolderAndBoardMake(DBMySQL))
  res.json(output)
}))

export default routes
