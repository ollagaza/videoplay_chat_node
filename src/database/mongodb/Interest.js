import mongoose from 'mongoose';
import Interest_BasicData from '../../data/Mongo_Interest_Data';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    codes: { type: Object, index: true, require: false, unique: true }
  };
};

const schema_field_infos = getFieldInfos();

const interest_schema = new Schema(schema_field_infos, { strict: false });

interest_schema.statics.InsertDefaultData = function () {
  const model = new this(Interest_BasicData);
  return model.save();
};

interest_schema.statics.findAll = function () {
  return this.find({});
};

const interest_model = mongoose.model( 'interrests', interest_schema );

export const InterestModel = interest_model;
export const InterestField = getFieldInfos;
