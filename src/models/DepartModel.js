import ModelObject from '@/classes/ModelObject';
import DepartInfo from "@/classes/surgbook/DepartInfo";

export default class DepartModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'depart';
    this.selectable_fields = ['*'];
  }

  getDepartList = async () => {
    const result_list = await this.find(null, null, {name: "name", order: "asc"});
    if (!result_list || result_list.length <= 0) {
      return new Array();
    }

    const custom = new Array();
    const depart_list = new Array();
    result_list.forEach((depart) => {
      const depart_info = new DepartInfo(depart);
      if (depart_info.isCustom()) {
        custom.push(depart_info);
      } else {
        depart_list.push(depart_info);
      }
    });

    if (custom) {
      return custom.concat(depart_list);
    }
    else {
      return depart_list;
    }
  }
}
