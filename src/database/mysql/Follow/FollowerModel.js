import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class FollowerModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'follower'
    this.selectable_fields = ['*']
    this.log_prefix = '[FollowerModel]'
  }

  getFollowerLists = async group_seq => {
    const display_columns = [
      'follower.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq', 'group_info.group_name',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'group_info.profile_image_path',
      this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
    ]
    const groupby_columns = [
      'follower.seq'
    ]
    const oKnex = this.database.select(display_columns);
    oKnex.from(this.table_name);
    oKnex.leftOuterJoin('following', function() {
      this.on('following.group_seq',  'follower.group_seq')
        .andOn('following.following_seq','follower.follower_seq');
    })
    oKnex.innerJoin('group_info', 'group_info.seq', 'follower.follower_seq');
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq');
    oKnex.where('follower.group_seq', group_seq);
    oKnex.groupBy(groupby_columns);

    return oKnex;
  };

  getInquiryFollowerLists = async (login_group_seq, inquiry_group_seq) => {
    const display_columns = [
      'follower.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq', 'group_info.group_name',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'group_info.profile_image_path',
      this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
    ]
    const groupby_columns = [
      'follower.seq'
    ]
    const oKnex = this.database.select(display_columns);
    oKnex.from(this.table_name);
    oKnex.leftOuterJoin('following', function() {
      this.on('following.group_seq',  login_group_seq)
        .andOn('following.following_seq','follower.follower_seq');
    })
    oKnex.innerJoin('group_info', 'group_info.seq', 'follower.follower_seq');
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq');
    oKnex.where('follower.group_seq', inquiry_group_seq);
    oKnex.groupBy(groupby_columns);

    return oKnex;
  };

  RegistFollower = async (follow_info) => {
    return this.create(follow_info);
  };

  UnRegistFollower = async (follow_info) => {
    return this.delete(follow_info);
  }
}
