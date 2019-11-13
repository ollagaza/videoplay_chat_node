import ModelObject from '@/classes/ModelObject';

export default class CodeSceneModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'code_scene';
    this.selectable_fields = ['*'];
  }
}
