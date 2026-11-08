const JSZip=require('jszip');
const MAX_BYTES=10*1024*1024;
const EXT_MIME={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
async function inspect(file){
 if(!file||!Buffer.isBuffer(file.buffer)||!file.buffer.length||file.buffer.length>MAX_BYTES) throw Object.assign(new Error('File must be nonempty and at most 10 MB'),{status:422});
 const name=String(file.originalname||'').replace(/[\\/\x00-\x1f]/g,'').slice(0,180);
 const ext=name.split('.').pop().toLowerCase();
 if(!Object.hasOwn(EXT_MIME,ext))throw Object.assign(new Error('Allowed files: PDF, DOC, DOCX, JPG, JPEG, PNG'),{status:422});
 const b=file.buffer;
 const is=(v)=>b.subarray(0,v.length).equals(Buffer.from(v));
 let valid=false;
 if(ext==='pdf')valid=is('%PDF-')&&b.includes(Buffer.from('%%EOF'));
 if(ext==='jpg'||ext==='jpeg')valid=b[0]===0xff&&b[1]===0xd8&&b[2]===0xff&&b[b.length-2]===0xff&&b[b.length-1]===0xd9;
 if(ext==='png')valid=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(ext==='doc')valid=b.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225]));
 if(ext==='docx'&&b.subarray(0,4).equals(Buffer.from([80,75,3,4]))) {
  try{const zip=await JSZip.loadAsync(b,{checkCRC32:true});valid=Boolean(zip.file('word/document.xml')&&zip.file('[Content_Types].xml'));}catch{valid=false;}
 }
 if(!valid)throw Object.assign(new Error('File content does not match its extension'),{status:422});
 return {name,mime:EXT_MIME[ext],size:b.length};
}
function safeDownloadName(value){return String(value||'attachment').replace(/[\\/\r\n"\x00-\x1f]/g,'_').slice(0,180);}
module.exports={inspect,safeDownloadName,MAX_BYTES};
