import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    _id: { type: Number, index: true, require: false, message: '수술 아이디가 없습니다.' },
    operation_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    group_list: { type: [Number], default: [], require: false, message: '그룹 코드 목록이 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    machine_type_list: { type: [String], default: [], require: false, message: '사용 장비가 없습니다.' },
    clinical_diagnosis_list: { type: [String], default: [], require: false, message: '임상 진단이 없습니다.' },
    operation_diagnosis_list: { type: [String], default: [], require: false, message: '임상 증상이 없습니다.' },
    clinical_symptoms_list: { type: [String], default: [], require: false, message: '수술중 진단이 없습니다.' },
    final_diagnosis_list: { type: [String], default: [], require: false, message: '최종 진단이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos._id.require = true;
schema_field_infos.member_seq.require = true;
schema_field_infos.content_id.require = true;

const operation_metadata_schema = new Schema(schema_field_infos);

operation_metadata_schema.indexes();
operation_metadata_schema.index( { member_seq: 1, group_list: 1 } );
operation_metadata_schema.index( { member_seq: 1, tag_list: 1 } );
operation_metadata_schema.index( { member_seq: 1, clinical_symptoms_list: 1 } );
operation_metadata_schema.index( { member_seq: 1, final_diagnosis_list: 1 } );

operation_metadata_schema.statics.createVideoProject = function( payload ) {
  const model = new this(payload);
  return model.save();
};

operation_metadata_schema.statics.updateStatus = function( id, status ) {
  const update = {
    status,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

operation_metadata_schema.statics.updateRequestStatus = function( id, request_status, progress = 0 ) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  };
  return this.findByIdAndUpdate( id, update );
};

operation_metadata_schema.statics.updateRequestStatusByContentId = function( content_id, request_status, progress = 0, video_file_name = null, smil_file_name = null ) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  };
  if (video_file_name) {
    update.video_file_name = video_file_name;
  }
  if (smil_file_name) {
    update.smil_file_name = smil_file_name;
  }
  return this.updateOne( { content_id: content_id }, update );
};

operation_metadata_schema.statics.updateProgress = function( id, progress ) {
  const update = {
    progress,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

operation_metadata_schema.statics.findOneById = function( id, projection = null ) {
  return this.findById( id, projection );
};

operation_metadata_schema.statics.findOneByContentId = function( content_id, projection = null ) {
  return this.findOne( { content_id: content_id }, projection );
};

operation_metadata_schema.statics.findByMemberSeq = function( member_seq, projection = null ) {
  return this.find( { member_seq: member_seq }, projection );
};

operation_metadata_schema.statics.findByOperationSeq = function( member_seq, operation_seq_list, projection = null ) {
  return this.find( { member_seq: member_seq, operation_seq_list: { "$in": operation_seq_list } }, projection );
};

operation_metadata_schema.statics.deleteById = function( id ) {
  return this.findByIdAndDelete( id );
};

const operation_metadata_model = mongoose.model( 'OperationMetadata', operation_metadata_schema );

export const OperationMetadataModel = operation_metadata_model;
export const OperationMetadataField = getFieldInfos;
