document.addEventListener('DOMContentLoaded', () => {
  const dialog=document.getElementById('photo-lightbox');
  if(!dialog || typeof dialog.showModal!=='function') return;
  const image=dialog.querySelector('img');
  const caption=dialog.querySelector('.photo-lightbox-caption');
  document.querySelectorAll('[data-lightbox-open]').forEach(button=>{
    button.addEventListener('click',()=>{
      image.src=button.dataset.photoSrc;
      image.alt=button.dataset.photoAlt || 'Destination photograph';
      caption.textContent=button.dataset.photoAlt || '';
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-lightbox-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog) dialog.close();});
});
