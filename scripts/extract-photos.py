"""Extract six supplied destination photos from trippack_photos.docx.
Run: python scripts/extract-photos.py /path/to/trippack_photos.docx
Requires python-docx and Pillow. Captions in source determine fixed image order.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import sys
from docx import Document
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'trippack_photos.docx'
if not source.exists():raise SystemExit('Missing '+str(source))
doc=Document(source)
labels=[p.text.strip().lower() for p in doc.paragraphs if 'Figure ' in p.text]
expected=['dangling','sakteng','merak','chorten','takila','bumdeling']
if len(doc.inline_shapes)!=6 or any(term not in labels[i] for i,term in enumerate(expected)):
 raise SystemExit('Expected six photos in caption order Dangling, Sakteng, Merak, Chorten, Takila, Bumdeling; manual check required')
slugs=['dangling-tsho','sakteng-village','merak-village','chorten-kora','takila','bumdeling']
out=root/'public'/'images'/'destinations';out.mkdir(parents=True,exist_ok=True)
for shape,slug in zip(doc.inline_shapes,slugs):
 rid=shape._inline.graphic.graphicData.pic.blipFill.blip.embed
 part=doc.part.related_parts[rid]
 with Image.open(BytesIO(part.blob)) as image:
  image.convert('RGB').save(out/(slug+'.jpg'),quality=90,optimize=True)
 print(slug+'.jpg')
