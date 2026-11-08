document.addEventListener('DOMContentLoaded',()=>{
 const form=document.querySelector('[data-proposal-form]');if(!form)return;
 const itineraryContainer=document.getElementById('itinerary-rows');const costContainer=document.getElementById('cost-rows');
 function parse(el){try{return JSON.parse(el.dataset.initial||'[]');}catch{return [];}}
 function input(type,value,placeholder){const element=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')element.type=type;element.value=value??'';if(placeholder)element.placeholder=placeholder;if(type==='number'){element.min='0';element.step='0.01';}return element;}
 function label(name,el){const l=document.createElement('label');l.textContent=name;l.append(el);return l;}
 function addRow(container,kind,row={}){
  if(container.children.length >= (kind==='cost'?40:30))return;
  const wrap=document.createElement('div');wrap.className='proposal-repeat-row';wrap.dataset.kind=kind;
  if(kind==='cost'){
   wrap.append(label('Cost category',input('text',row.label,'Transport / food / accommodation')),label('Amount (Nu.)',input('number',row.amount,'0.00')));
  }else{
   wrap.append(label('Day number',input('number',row.day_number||1,'1')),label('Start time',input('time',row.start_time||'','')),label('Activity title',input('text',row.title,'Activity')),label('Details',input('textarea',row.description,'Describe activity')));
  }
  const remove=document.createElement('button');remove.type='button';remove.className='btn btn-secondary';remove.textContent='Remove';remove.addEventListener('click',()=>wrap.remove());wrap.append(remove);container.append(wrap);
 }
 function serialize(container){return Array.from(container.children).map(w=>{
  const fields=w.querySelectorAll('input,textarea');return w.dataset.kind==='cost'?{label:fields[0].value.trim(),amount:fields[1].value}:{day_number:Number(fields[0].value),start_time:fields[1].value,title:fields[2].value.trim(),description:fields[3].value.trim()};
 }).filter(r=>r.label!==''||r.title!=='');}
 parse(itineraryContainer).forEach(row=>addRow(itineraryContainer,'itinerary',row));parse(costContainer).forEach(row=>addRow(costContainer,'cost',row));
 form.querySelector('[data-add-day]').addEventListener('click',()=>addRow(itineraryContainer,'itinerary'));
 form.querySelector('[data-add-cost]').addEventListener('click',()=>addRow(costContainer,'cost'));
 form.addEventListener('submit',()=>{document.getElementById('itinerary-json').value=JSON.stringify(serialize(itineraryContainer));document.getElementById('costs-json').value=JSON.stringify(serialize(costContainer));});
});
