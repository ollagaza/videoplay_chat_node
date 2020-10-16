import MySQLModel from '../../mysql-model'

export default class FollowingModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'following'
    this.selectable_fields = ['*']
    this.log_prefix = '[FollowingModel]'
  }

  getFollowingLists = async group_seq => {
    const display_columns = [
      'following.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq', 'group_info.group_name',
      'group_info.hashtag', 'group_info.profile_image_path',
      'member.user_id', 'member.user_name', 'member.hospname', 'member.user_nickname',
      'group_counts.community', 'group_counts.follower'
    ]
    const oKnex = this.database.select(display_columns)
    oKnex.from(this.table_name)
    oKnex.innerJoin('group_info', 'group_info.seq', 'following.following_seq')
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq')
    oKnex.leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
    oKnex.where({ 'following.group_seq': group_seq })
    oKnex.orderBy('group_info.group_name', 'asc')

    return oKnex
  }

  getInquiryFollowingLists = async (login_group_seq, inquiry_group_seq) => {
    const display_columns = [
      'following.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq', 'group_info.group_name',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'group_info.profile_image_path',
      this.database.raw('case when count(following_login.seq) > 0 then 1 else 0 end following_chk'),
    ]
    const groupby_columns = [
      'following.seq'
    ]
    const oKnex = this.database.select(display_columns)
    oKnex.from(this.table_name)
    oKnex.leftOuterJoin(`${this.table_name} as following_login`, function () {
      this.on('following_login.following_seq', 'following.following_seq')
        .andOn('following_login.group_seq', login_group_seq)
    })
    oKnex.innerJoin('group_info', 'group_info.seq', 'following.following_seq')
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq')
    oKnex.where('following.group_seq', inquiry_group_seq)
    oKnex.groupBy(groupby_columns)

    return oKnex
  }

  getFollowing = async (group_seq, following_seq) => {
    const display_columns = [
      'following.seq',
      this.database.raw('group_info.seq as group_seq'), 'group_info.member_seq', 'group_info.group_name',
      'member.user_id', 'member.user_name', 'member.user_nickname', 'group_info.profile_image_path',
      this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
    ]
    const groupby_columns = [
      'following.seq'
    ]
    const oKnex = this.database.select(display_columns)
    oKnex.from('group_info')
    oKnex.leftOuterJoin(this.table_name, function () {
      this.on('group_info.seq', 'following.following_seq').andOn({ group_seq })
    })
    oKnex.innerJoin('member', 'member.seq', 'group_info.member_seq')
    oKnex.where('group_info.seq', following_seq)
    oKnex.groupBy(groupby_columns)

    return oKnex
  }

  RegistFollowing = async (follow_info) => {
    return this.create(follow_info)
  }

  UnRegistFollowing = async (follow_info) => {
    return this.delete(follow_info)
  }
}
