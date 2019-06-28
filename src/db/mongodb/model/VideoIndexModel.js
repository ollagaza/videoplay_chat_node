import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    operation_seq: { type: Number, index: true, require: false, message: '수술 정보가 없습니다.' },
    creator: { type: String, require: false },
    thumbnail_url: { type: String, require: false, default: null },
    start_time: { type: Number, require: false, default: 0 },
    end_time: { type: Number, require: false, default: 0 },
    start_frame: { type: Number, require: false, default: 0 },
    tag: { type: [String], require: false, default: [] },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos.member_seq.require = true;
schema_field_infos.operation_seq.require = true;

const VideoIndexInfoSchema = new Schema(schema_field_infos);

VideoIndexInfoSchema.indexes();
VideoIndexInfoSchema.index( { operation_seq: 1, member_seq: 1, start_frame: 1 } );


VideoIndexInfoSchema.statics.createVideoIndexInfo = function( payload ) {
  const model = new this(payload);
  return model.save();
};

VideoIndexInfoSchema.statics.createByList = function( payload_list ) {
  return this.insertMany(payload_list);
};

VideoIndexInfoSchema.statics.updateEndTime = function( id, end_time ) {
  const update = {
    end_time,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoIndexInfoSchema.statics.findList = function( operation_seq, member_seq = null ) {
  const filter = { operation_seq: operation_seq };
  if (member_seq) {
    filter.member_seq = member_seq;
  }
  return this.find( filter );
};

VideoIndexInfoSchema.statics.findOneById = function( id, projection = null ) {
  return this.findById( id, projection );
};

VideoIndexInfoSchema.statics.deleteById = function( member_seq, id ) {
  return this.findOneAndDelete( { member_seq: member_seq, _id: id } );
};

const model = mongoose.model( 'VideoIndexInfo', VideoIndexInfoSchema );
export const VideoIndexInfoModel = model;
export const VideoIndexInfoField = getFieldInfos;
