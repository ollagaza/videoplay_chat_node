import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class FollowingModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'following'
    this.selectable_fields = ['*']
    this.log_prefix = '[FollowingModel]'
  }

  getFollowingLists = async group_seq => {
    const display_columns = [
      'following.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'member.profile_image_path',
    ]
    const oKnex = this.database.select(display_columns);
    oKnex.from(this.table_name);
    oKnex.innerJoin('group_info', 'group_info.seq', 'following.following_seq');
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq');
    oKnex.where({ group_seq });

    return oKnex;
  };

  getFollowing = async (group_seq, following_seq) => {
    const display_columns = [
      'following.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'member.profile_image_path',
      this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
    ]
    const groupby_columns = [
      'following.seq', 'member.user_name', 'member.user_nickname', 'member.profile_image_path'
    ]
    const oKnex = this.database.select(display_columns);
    oKnex.from('group_info');
    oKnex.leftOuterJoin(this.table_name, function() {
      this.on('group_info.seq', 'following.following_seq').andOn({ group_seq });
    });
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq');
    oKnex.where('group_info.seq', following_seq);
    oKnex.groupBy(groupby_columns);

    return oKnex;
  };

  RegistFollowing = async (follow_info) => {
    return this.create(follow_info);
  }

  UnRegistFollowing = async (follow_info) => {
    return this.delete(follow_info);
  }
}
