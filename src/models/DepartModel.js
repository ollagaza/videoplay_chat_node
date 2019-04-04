import ModelObject from '@/classes/ModelObject';
import DepartInfo from "@/classes/surgbook/DepartInfo";

let depart_map = null;
let depart_list = null;

export default class DepartModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'depart';
    this.selectable_fields = ['*'];
  }

  getDepartList = async () => {
    if (depart_list) {
      return depart_list;
    }

    depart_map = {};
    const result_list = await this.find(null, null, {name: "name", order: "asc"});
    if (!result_list || result_list.length <= 0) {
      return [];
    }

    const custom = [];
    const list = [];
    result_list.forEach((hospital) => {
      const depart_info = new DepartInfo(hospital);
      if (depart_info.isCustom()) {
        custom.push(depart_info);
      } else {
        list.push(depart_info);
      }
      depart_map[depart_info.code] = depart_info;
    });

    if (custom) {
      depart_list = custom.concat(list);
    }
    else {
      depart_list = list;
    }

    return depart_list;
  };

  getDepartNameByMemberInfo = async (member_info) => {
    await this.getDepartList();
    const depart_info = depart_list[member_info.depart_code];
    if (depart_info) {
      if (depart_info.isCustom()) {
        return member_info.custom_branch;
      } else {
        return depart_info.name;
      }
    }
    return '';
  };
}
