import JsonWrapper from '../json-wrapper'

const default_key_list = [
  'seq', 'group_seq', 'folder_name', 'parent_folder_seq', 'status', 'depth',
  'access_type', 'access_users', 'reg_date', 'modify_date'
];

export default class OperationFolderInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(default_key_list);

    if (data.access_users && typeof data.access_users === 'string') {
      this.access_users = JSON.parse(data.access_users)
    }
  }
}
