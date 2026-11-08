// Fetch API + optimistic checkboxes with rollback and accessible feedback.
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.querySelector('[data-packing]');if(!root)return;
 const base=root.dataset.base,token=root.dataset.csrf;
 const status=root.querySelector('[data-feedback]');
 function notify(message,error=false){status.textContent=message;status.classList.toggle('form-error',error);}
 async function send(path,payload){const response=await fetch(path,{
  method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':token},
  credentials:'same-origin',body:JSON.stringify(payload)
 });let data;try{data=await response.json();}catch{throw new Error('Unexpected server response');}
 if(!response.ok||!data.ok)throw new Error(data.error||'Update failed');return data;}
 function progress(){const boxes=[...root.querySelectorAll('[data-packed]')];const packed=boxes.filter(x=>x.checked).length;
  const percent=boxes.length?Math.round(packed/boxes.length*100):0;
  root.querySelector('[data-progress-text]').textContent=`${packed} of ${boxes.length} items packed (${percent}%)`;
  root.querySelector('[data-progress-bar]').value=percent;
 }
 root.addEventListener('change',async e=>{
  const checkbox=e.target.closest('[data-packed]');if(!checkbox)return;
  if(checkbox.dataset.busy==='true')return;
  const previous=!checkbox.checked;checkbox.dataset.busy='true';progress();notify('Saving…');
  try{await send(`${base}/toggle`,{itemId:checkbox.dataset.id,packed:checkbox.checked});notify('Packing item updated');}
  catch(err){checkbox.checked=previous;progress();notify(`${err.message}. Your previous status was restored.`,true);}
  finally{delete checkbox.dataset.busy;}
 });
 root.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-packing-form]');if(!form)return;e.preventDefault();
  const button=form.querySelector('button[type="submit"]');button.disabled=true;notify('Saving…');
  try{const payload=Object.fromEntries(new FormData(form).entries());await send(form.action,payload);notify('Saved successfully');window.location.reload();}
  catch(err){notify(err.message,true);button.disabled=false;}
 });
 root.addEventListener('click',async e=>{
  const button=e.target.closest('[data-remove-item]');if(!button)return;
  if(!window.confirm('Remove this item?'))return;
  button.disabled=true;
  try{await send(button.dataset.path,button.dataset.suggestion?{suggestionId:button.dataset.id}:{itemId:button.dataset.id});
   button.closest('[data-list-row]').remove();progress();notify('Item removed');}
  catch(err){notify(err.message,true);button.disabled=false;}
 });
 progress();
});
