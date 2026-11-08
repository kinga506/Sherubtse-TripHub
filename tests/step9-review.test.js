const Review=require('../models/ProposalReview');
const {inspect,safeDownloadName}=require('../services/attachmentValidation');
test('requires verified lead ID and never permits duplicate lead among assistants',()=>{
 expect(()=>Review.normalizedIds('',[])).toThrow();
 expect(()=>Review.normalizedIds('1',['1'])).toThrow();
 expect(Review.normalizedIds('2',['3','3'])).toEqual({leadId:2,extras:[3]});
});
test('sniffs a real PDF header and trailer, not browser MIME alone',async()=>{
 const file={originalname:'proposal.pdf',mimetype:'text/plain',buffer:Buffer.from('%PDF-1.4\nexample\n%%EOF')};
 expect((await inspect(file)).mime).toBe('application/pdf');
 await expect(inspect({...file,buffer:Buffer.from('invalid')})).rejects.toThrow(/does not match/);
});
test('rejects unsupported file extension and oversized files',async()=>{
 await expect(inspect({originalname:'bad.exe',buffer:Buffer.from('binary')})).rejects.toThrow(/Allowed files/);
 await expect(inspect({originalname:'big.pdf',buffer:Buffer.alloc(10*1024*1024+1,1)})).rejects.toThrow(/10 MB/);
});
test('sanitizes Content-Disposition filenames',()=>{
 expect(safeDownloadName('abc\r\nContent-Type: text/html.pdf')).not.toMatch(/[\r\n]/);
});
