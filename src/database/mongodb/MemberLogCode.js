import mongoose from 'mongoose';
import LogCode_BasicData from '../../data/Mongo_MemberLogCodes_Data';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: true, require: false, unique: true }
  };
};

const schema_field_infos = getFieldInfos();

const logcode_schema = new Schema(schema_field_infos, { strict: false });

logcode_schema.statics.InsertDefaultData = function () {
  const model = new this(LogCode_BasicData);
  return model.save();
};

logcode_schema.statics.findAll = function () {
  return this.find({});
};

const logcode_model = mongoose.model( 'memberlogcode', logcode_schema );

export const LogCodeModel = logcode_model;
export const LogCodeField = getFieldInfos;
