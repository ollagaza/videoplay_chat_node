import mongoose from 'mongoose';
import {autoIncrement} from 'mongoose-plugin-autoinc';

const Schema = mongoose.Schema;

const TestSchema = new Schema({
  content_id: { type: String, index: true },
  created_date: { type: Date, default: Date.now },
  modify_date: { type: Date, default: Date.now },
  sequence_list: Array
});

TestSchema.plugin(autoIncrement, 'test');
TestSchema.statics.create = function(content_id, sequence_list) {
  const test = new this();
  test.content_id = content_id;
  test.sequence_list = sequence_list;

  return test.save();
};

TestSchema.statics.findOneById = function(id) {
  return this.findById(id);
};

TestSchema.statics.findBySequence = function(sequence_list) {
  return this.find({ sequence_list: { "$in": sequence_list } });
};


const model = mongoose.model('test', TestSchema);

export default model;
