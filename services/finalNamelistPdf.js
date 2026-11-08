const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function rosterSnapshot(rows) {
 return rows.map(r=>({participantId:Number(r.participant_id),studentUserId:Number(r.user_id),name:String(r.name),studentId:String(r.student_id||''),programme:String(r.programme||''),academicYear:String(r.academic_year||''),consentDocumentId:Number(r.consent_document_id),consentVersion:Number(r.consent_version)}));
}
async function composePackage(trip, participants, readObject){
 if(!participants.length)throw new Error('At least one approved participant is required');
 const pdf=await PDFDocument.create();
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const page=pdf.addPage([595,842]); let y=797;
 const line=(value,x=40,size=11,font=regular)=>{page.drawText(String(value).replace(/[^\x20-\x7e]/g,'?').slice(0,95),{x,y,size,font,color:rgb(0.12,0.2,0.17)});y-=21;};
 line('SHERUBTSE TRIPHUB - FINAL PARTICIPANT NAMELIST',40,15,bold);
 line('Trip: '+trip.title,40,11,bold);line('Trip ID: '+trip.id+'    Approved: '+participants.length+' / Maximum: '+trip.max_participants);
 line('This is a platform review package, not an official signed travel form.',40,9);
 y-=12;line('No.    Student name                                     Student ID                  Consent v.',40,10,bold);
 participants.forEach((p,i)=>{if(y<60)throw new Error('Roster exceeds single-page cover; split required');const name=String(p.name||'');const studentId=String(p.studentId??p.student_id??'');const version=p.consentVersion??p.consent_version??'';line(`${String(i+1).padStart(2)}     ${name.slice(0,40).padEnd(43)} ${studentId.slice(0,15).padEnd(18)} ${version}`,40,9);});
 for(let i=0;i<participants.length;i++){
  const p=participants[i];const storageKey=p.storageKey??p.storage_key;const mime=p.mime??p.detected_mime_type;const bytes=await readObject(storageKey);if(!bytes||!bytes.length)throw new Error('Consent file unavailable');
  const label=pdf.addPage([595,842]);label.drawText(`Consent letter ${i+1} of ${participants.length}`,{x:42,y:780,size:15,font:bold});
  label.drawText(`Student: ${p.name.replace(/[^\x20-\x7e]/g,'?').slice(0,75)}`,{x:42,y:752,size:11,font:regular});
  label.drawText(`Verified upload version: ${p.consentVersion}`,{x:42,y:730,size:10,font:regular});
  if(mime==='application/pdf'){
   const source=await PDFDocument.load(bytes,{ignoreEncryption:false});if(source.isEncrypted)throw new Error('Encrypted consent PDF not accepted');
   const pages=await pdf.copyPages(source,source.getPageIndices());if(!pages.length)throw new Error('Consent PDF is empty');pages.forEach(pg=>pdf.addPage(pg));
  }else{
   const img=mime==='image/jpeg'?await pdf.embedJpg(bytes):mime==='image/png'?await pdf.embedPng(bytes):null;
   if(!img)throw new Error('Unsupported consent format');
   const size=img.scale(Math.min(1,510/img.width,740/img.height));
   const imagePage=pdf.addPage([595,842]);imagePage.drawImage(img,{x:(595-size.width)/2,y:(842-size.height)/2,width:size.width,height:size.height});
  }
 }
 return Buffer.from(await pdf.save());
}
module.exports={rosterSnapshot,composePackage};
