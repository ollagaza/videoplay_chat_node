import ModelObject from '@/classes/ModelObject';
import HospitalModel from "@/models/HospitalModel";
import DepartModel from "@/models/DepartModel";
import ClipModel from "@/models/xmlmodel/ClipModel";
import Util from '@/utils/baseutil';

export default class ServiceVideoModel extends ModelObject {
  constructor(...args) {
    super(...args);
  }

  n  = (scale, value) => {
    return parseFloat((value * scale).toFixed(2));
  };

  saveServiceVideoXML = async (operation_info, member_info, sub_content_id) => {
    const clip_info_list = await new ClipModel({ "database": this.database }).getClipInfoList(operation_info);

    const hospital_name = await new HospitalModel({ "database": this.database }).getHospitalNameByMemberInfo(member_info);
    const depart_name = await new DepartModel({ "database": this.database }).getDepartNameByMemberInfo(member_info);
    const profile_image_path = member_info.profile_image_path ? member_info.profile_image_path : '';
    const profile_image_url = member_info.profile_image_path ? member_info.profile_image_url : '';

    let scale = 1;
    const width = operation_info.media_info.width ? operation_info.media_info.width : 1920;
    const height = operation_info.media_info.height ? operation_info.media_info.height : 1080;
    const w_ratio = width / 1920;
    const h_ratio = height / 1080;
    if (w_ratio >= h_ratio) {
      scale = w_ratio;
    } else {
      scale = h_ratio;
    }

    let xml_str = '';
    xml_str += `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
    xml_str += `<!DOCTYPE VideoInfo [\n`;
    xml_str += `  <!ENTITY OperationCode "<![CDATA[${operation_info.operation_code}]]>">\n`;
    xml_str += `  <!ENTITY OperationName "<![CDATA[${operation_info.operation_code}]]>">\n`;
    xml_str += `  <!ENTITY OperationDate "<![CDATA[${operation_info.operation_date}]]>">\n`;
    xml_str += `  <!ENTITY PatientAge "<![CDATA[${operation_info.patient_age}]]>">\n`;
    xml_str += `  <!ENTITY PatientSex "<![CDATA[${operation_info.patient_sex}]]>">\n`;
    xml_str += `  <!ENTITY PatientRace "<![CDATA[${operation_info.patient_race}]]>">\n`;
    xml_str += `  <!ENTITY HospitalName "<![CDATA[${hospital_name}]]>">\n`;
    xml_str += `  <!ENTITY DepartName "<![CDATA[${depart_name}]]>">\n`;
    xml_str += `  <!ENTITY DoctorName "<![CDATA[${member_info.user_name}]]>">\n`;
    xml_str += `  <!ENTITY DoctorProfileUrl "<![CDATA[${profile_image_url}]]>">\n`;
    xml_str += `  <!ENTITY DoctorProfilePath "<![CDATA[${profile_image_path}]]>">\n`;
    xml_str += `  <!ENTITY HospitalLogoUrl "<![CDATA[]]>">\n`;
    xml_str += `  <!ENTITY HospitalLogoPath "<![CDATA[]]>">\n`;
    xml_str += `]>\n`;

    xml_str += `<VideoInfo>\n`;
    xml_str += `  <MediaInfo>\n`;
    xml_str += `    <ContentId><![CDATA[${operation_info.content_id}]]></ContentId>\n`;
    xml_str += `    <SubContentId><![CDATA[${sub_content_id}]]></SubContentId>\n`;
    xml_str += `    <MediaPath><![CDATA[${operation_info.media_info.origin_video_path}]]></MediaPath>\n`;
    xml_str += `    <HlsStreamUrl><![CDATA[${operation_info.media_info.hls_streaming_url}]]></HlsStreamUrl>\n`;
    xml_str += `    <Width><![CDATA[${width}]]></Width>\n`;
    xml_str += `    <Height><![CDATA[${height}]]></Height>\n`;
    xml_str += `  </MediaInfo>\n`;
    xml_str += `  <OperationInfo>\n`;
    xml_str += `    <OperationCode>&OperationCode;</OperationCode>\n`;
    xml_str += `    <OperationName>&OperationName;</OperationName>\n`;
    xml_str += `    <OperationDate>&OperationDate;</OperationDate>\n`;
    xml_str += `    <PatientAge>&PatientAge;</PatientAge>\n`;
    xml_str += `    <PatientSex>&PatientSex;</PatientSex>\n`;
    xml_str += `    <PatientRace>&PatientRace;</PatientRace>\n`;
    xml_str += `  </OperationInfo>\n`;
    xml_str += `  <DoctorInfo>\n`;
    xml_str += `    <HospitalName>&HospitalName;</HospitalName>\n`;
    xml_str += `    <DepartName>&DepartName;</DepartName>\n`;
    xml_str += `    <DoctorName>&DoctorName;</DoctorName>\n`;
    xml_str += `    <DoctorProfileUrl>&DoctorProfileUrl;</DoctorProfileUrl>\n`;
    xml_str += `    <DoctorProfilePath>&DoctorProfilePath;</DoctorProfilePath>\n`;
    xml_str += `    <HospitalLogoUrl>&HospitalLogoUrl;</HospitalLogoUrl>\n`;
    xml_str += `    <HospitalLogoPath>&HospitalLogoPath;</HospitalLogoPath>\n`;
    xml_str += `  </DoctorInfo>\n`;

    let index = 0;
    let duration = 3;
    let virtual_start_time = 0;
    let virtual_end_time = virtual_start_time + duration;
    xml_str += `  <ClipInfoList>\n`;
    xml_str += `    <ClipInfo>\n`;
    xml_str += `      <Index>0</Index>\n`;
    xml_str += `      <BackGround>0xffffff</BackGround>\n`;
    xml_str += `      <ClipType>intro</ClipType>\n`;
    xml_str += `      <ClipDuration>${duration}</ClipDuration>\n`;
    xml_str += `      <VideoStartTime>0</VideoStartTime>\n`;
    xml_str += `      <VideoEndTime>${duration}</VideoEndTime>\n`;
    xml_str += `      <VirtualStartTime>${virtual_start_time}</VirtualStartTime>\n`;
    xml_str += `      <VirtualEndTime>${virtual_end_time}</VirtualEndTime>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>&OperationName;</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Bold" Size="${this.n(scale, 72)}" Color="0x000000" Alpha="1" Align="Center" />\n`;
    xml_str += `        <MultiLine>True</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" MaxWidth="${this.n(scale, 1152)}" />\n`;
    xml_str += `        <Position Horizon="Center" Bottom="${this.n(scale, 760)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>&OperationDate;</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Bold" Size="${this.n(scale, 48)}" Color="0x000000" Alpha="1" Align="Left" />\n`;
    xml_str += `        <MultiLine>False</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 500)}" Left="${this.n(scale, 460)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>나이: &PatientAge;</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 36)}" Color="0x000000" Alpha="1" Align="Left" />\n`;
    xml_str += `        <MultiLine>False</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 590)}" Left="${this.n(scale, 475)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>성별: &PatientSex;</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 36)}" Color="0x000000" Alpha="1" Align="Left" />\n`;
    xml_str += `        <MultiLine>False</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 640)}" Left="${this.n(scale, 475)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>인종: &PatientRace;</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 36)}" Color="0x000000" Alpha="1" Align="Left" />\n`;
    xml_str += `        <MultiLine>False</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 690)}" Left="${this.n(scale, 475)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Text</Type>\n`;
    xml_str += `        <Src>Powered by SURGSTORY.com</Src>\n`;
    xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 36)}" Color="0x999999" Alpha="1" Align="Center" />\n`;
    xml_str += `        <MultiLine>False</MultiLine>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 690)}" Left="${this.n(scale, 475)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>None</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `      <Embedding>\n`;
    xml_str += `        <Type>Image</Type>\n`;
    xml_str += `        <Src>&DoctorProfilePath;</Src>\n`;
    xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
    xml_str += `        <Size Width="${this.n(scale, 300)}" Height="${this.n(scale, 400)}" />\n`;
    xml_str += `        <Position Top="${this.n(scale, 400)}" Right="${this.n(scale, 460)}" />\n`;
    xml_str += `        <Padding>0</Padding>\n`;
    xml_str += `        <Resize>Cover</Resize>\n`;
    xml_str += `      </Embedding>\n`;
    xml_str += `    </ClipInfo>\n`;

    clip_info_list.forEach((clip_info) => {
      if (!clip_info.isEmpty() && clip_info.seq_list) {
        const clip_num = (`0${clip_info.clip_num}`).slice(-2);
        clip_info.seq_list.forEach((seq_info) => {
          const seq_num = (`0${seq_info.seq_num}`).slice(-2);
          const seq_id = `#${clip_num}_${seq_num}`;

          index++;
          duration = 3;
          virtual_start_time = virtual_end_time;
          virtual_end_time += duration;
          xml_str += `    <ClipInfo>\n`;
          xml_str += `      <Index>${index}</Index>\n`;
          xml_str += `      <BackGround>0x000000</BackGround>\n`;
          xml_str += `      <ClipType>clip_desc</ClipType>\n`;
          xml_str += `      <ClipDuration>${duration}</ClipDuration>\n`;
          xml_str += `      <VideoStartTime>0</VideoStartTime>\n`;
          xml_str += `      <VideoEndTime>${duration}</VideoEndTime>\n`;
          xml_str += `      <VirtualStartTime>${virtual_start_time}</VirtualStartTime>\n`;
          xml_str += `      <VirtualEndTime>${virtual_end_time}</VirtualEndTime>\n`;
          xml_str += `      <Embedding>\n`;
          xml_str += `        <Type>Text</Type>\n`;
          xml_str += `        <Src><![CDATA[${seq_id}]]></Src>\n`;
          xml_str += `        <Font Name="Noto Sans CJK KR Bold" Size="${this.n(scale, 144)}" Color="0xffffff" Alpha="1" Align="Center" />\n`;
          xml_str += `        <MultiLine>False</MultiLine>\n`;
          xml_str += `        <BackGround Color="0x000000" Alpha="0" />\n`;
          xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
          xml_str += `        <Position Horizon="Center" Vertical="Center" />\n`;
          xml_str += `        <Padding>0</Padding>\n`;
          xml_str += `      </Embedding>\n`;
          xml_str += `    </ClipInfo>\n`;

          index++;
          duration = seq_info.end_time - seq_info.start_time;
          virtual_start_time = virtual_end_time;
          virtual_end_time = virtual_start_time + duration;
          xml_str += `    <ClipInfo>\n`;
          xml_str += `      <Index>${index++}</Index>\n`;
          xml_str += `      <BackGround>0x000000</BackGround>\n`;
          xml_str += `      <ClipType>clip</ClipType>\n`;
          xml_str += `      <ClipDuration>${duration}</ClipDuration>\n`;
          xml_str += `      <VideoStartTime>${seq_info.start_time}</VideoStartTime>\n`;
          xml_str += `      <VideoEndTime>${seq_info.end_time}</VideoEndTime>\n`;
          xml_str += `      <VirtualStartTime>${virtual_start_time}</VirtualStartTime>\n`;
          xml_str += `      <VirtualEndTime>${virtual_end_time}</VirtualEndTime>\n`;
          xml_str += `      <Embedding>\n`;
          xml_str += `        <Type>Text</Type>\n`;
          xml_str += `        <Src><![CDATA[${seq_id}]]></Src>\n`;
          xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 54)}" Color="0xffffff" Alpha="1" Align="Center" />\n`;
          xml_str += `        <MultiLine>False</MultiLine>\n`;
          xml_str += `        <BackGround Color="0x000000" Alpha="0.5" />\n`;
          xml_str += `        <Size Width="Auto" Height="Auto" />\n`;
          xml_str += `        <Position Left="${this.n(scale, 36)}" Top="${this.n(scale, 36)}" />\n`;
          xml_str += `        <Padding>0</Padding>\n`;
          xml_str += `      </Embedding>\n`;
          xml_str += `      <Embedding>\n`;
          xml_str += `        <Type>Text</Type>\n`;
          xml_str += `        <Src><![CDATA[${seq_info.desc}]]></Src>\n`;
          xml_str += `        <Font Name="Noto Sans CJK KR Regular" Size="${this.n(scale, 36)}" Color="0xffffff" Alpha="1" Align="Center" />\n`;
          xml_str += `        <MultiLine>True</MultiLine>\n`;
          xml_str += `        <BackGround Color="0x000000" Alpha="0.5" />\n`;
          xml_str += `        <Size Width="Auto" Height="Auto" MaxWidth="${this.n(scale, 1280)}" />\n`;
          xml_str += `        <Position Horizon="Center" Bottom="${this.n(scale, 18)}" />\n`;
          xml_str += `        <Padding>${this.n(scale, 18)}</Padding>\n`;
          xml_str += `      </Embedding>\n`;
          xml_str += `    </ClipInfo>\n`;
        });
      }
    });

    xml_str += `  </ClipInfoList>\n`;
    xml_str += `</VideoInfo>`;

    const xml_path = operation_info.media_directory + 'ServiceVideo.xml'
    await Util.writeFile(xml_path, xml_str);

    return xml_path;
  };
}
