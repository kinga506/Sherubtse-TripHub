"""Offline authoring helper: extract supplied TripPack.docx into db/seed-data.json.
Run: python scripts/build-seed-data.py [TripPack.docx]
Requires python-docx. This is NOT the database seeder.
"""
import sys, re, json, pathlib
from docx import Document
ROOT=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/'TripPack.docx'
if not source.exists():
    raise SystemExit('TripPack source not found: '+str(source))
doc=Document(source)
pars=[p.text.strip() for p in doc.paragraphs if p.text.strip()]
starts=[i for i,s in enumerate(pars) if re.match(r'^Place name:',s)]
dests=[]
slugs=['chorten-kora','bumdeling','merak-village','sakteng-village','dangling-tsho','takila']
costs=[(300,600),(350,650),(800,1500),(700,1300),(300,600),(1200,2000)]
for j,start in enumerate(starts[:6]):
    end=starts[j+1] if j+1<len(starts) else next(i for i in range(start+1,len(pars)) if pars[i].startswith('7. Summary'))
    block=pars[start:end]
    def field(prefix):
        return next((s.split(':',1)[1].strip() for s in block if s.startswith(prefix+':')),None)
    name=field('Place name')
    # Preserve original source strings and provide display names without parentheticals where useful.
    common=['Chorten Kora','Bumdeling Wildlife Sanctuary','Merak Village','Sakteng Village','Dangling Tsho','Takila (Guru Nangsa Zelnen Statue)'][j]
    travel=field('Travel time') or ''
    drive,trek=travel,None
    if j==4:
        drive='Approximately 2–2.5 hours by road to Khaling.'
        trek='7–8 hours of walking to the lake.'
    if j in (2,3):
        trek='Walking may be required; confirm current road access.'
    notes=[s.split(':',1)[-1].strip() for s in block if s.startswith(('Transport note:','Important:'))]
    dests.append(dict(slug=slugs[j],name=common,source_name=name,dzongkhag=field('Dzongkhag'),description=field('Description'),best_season=field('Best season to visit'),transport=field('Transport'),transport_cost_min=costs[j][0],transport_cost_max=costs[j][1],transport_cost_source=field('Estimated transport cost'),entry_fee_note=field('Entry fee'),distance_text=field('Distance from Sherubtse College'),drive_time_text=drive,trek_time_text=trek,travel_note=' '.join(notes) or None,practical_tip=field('Practical tip'),is_trek=j==4,photo=f'/images/destinations/{slugs[j]}.jpg'))
programmes=[]
for row in doc.tables[7].rows[1:]:
    full,short=[c.text.strip() for c in row.cells]
    programmes.append({'name':full,'code':short})
trip_meta=[('chorten-kora','2027-03-12','2027-03-13',1800,20,'06:30'),('merak-village','2027-04-09','2027-04-11',3500,15,'05:30'),('sakteng-village','2027-04-23','2027-04-25',4000,12,'05:00'),('dangling-tsho','2027-05-07','2027-05-10',5000,10,'05:30'),('takila','2027-03-26','2027-03-28',4500,20,'05:00')]
trips=[]
for i,tbl in enumerate(doc.tables[1:6]):
    data={row.cells[0].text.strip():row.cells[1].text.strip() for row in tbl.rows[1:]}
    slug,start,end,cost,max_participants,meeting=trip_meta[i]
    trips.append(dict(seed_key=f'source-trip-{i+1}',title=data['Trip title'],destination_slug=slug,start_date=start,end_date=end,meeting_time=meeting,meeting_point=data['Meeting point'],estimated_cost=cost,max_participants=max_participants,description=f'Source demonstration itinerary: {data["Destination"]}. Dates and costs are proposed examples, not confirmed college trips.',is_sample=True,estimated_budget_note='Detailed cost breakdown not provided in the source material.',source_date_text=data['Dates']))
# Preserve original five itineraries, packing suggestions and announcement text.
trip_positions=[next(i for i,s in enumerate(pars) if s.startswith(f'Trip {n}:')) for n in range(1,6)]
for n,begin in enumerate(trip_positions):
    end=trip_positions[n+1] if n+1<len(trip_positions) else next(i for i in range(begin+1,len(pars)) if s_is_summary(pars[i])) if False else next(i for i in range(begin+1,len(pars)) if pars[i].startswith('Overall comparison'))
    section=pars[begin:end]
    a=section.index('Day-by-day itinerary')+1
    b=section.index('Suggested packing list')
    c=section.index('Trip announcement')
    days=[];day=0
    for item in section[a:b]:
        m=re.match(r'^- Day (\d+):',item)
        if m:
            day=int(m.group(1)); continue
        tm=re.match(r'^(\d{1,2}:\d{2}) (AM|PM): (.*)',item)
        if tm:
            hh,mm=map(int,tm.group(1).split(':'))
            if tm.group(2)=='PM' and hh<12:hh+=12
            if tm.group(2)=='AM' and hh==12:hh=0
            time=f'{hh:02d}:{mm:02d}'
        else:time=None
        days.append({'day_number':day or 1,'start_time':time,'title':item,'description':item})
    trips[n]['itinerary']=days
    trips[n]['packing_suggestions']=section[b+1:c]
    trips[n]['announcement']=section[c+2] if len(section)>c+2 else None
users=[]
for tbl in doc.tables[10:12]:
    fields={r.cells[0].text.strip():r.cells[1].text.strip() for r in tbl.rows[1:]}
    email=fields['Email']; users.append(dict(name='Karma Wangchuk' if not users else 'Pema Choden',email=email,student_id=email.split('.')[0],programme=fields['Programme'],demo_original_coordinator=True))
for row in doc.tables[12].rows[1:]:
    cells=[c.text.strip() for c in row.cells]
    users.append(dict(name=cells[1],programme=cells[2],student_id=cells[3],email=cells[4],demo_original_coordinator=False))
faq=[]; rules=[]; testimonials=[]
# Extract source FAQ numbered headings and corresponding answers exactly.
for i,p in enumerate(pars):
    if re.match(r'^[1-8]\. (How|When|What|Can|Are|Who)',p) and i+1<len(pars):
        faq.append(dict(seed_key='source-faq-'+str(len(faq)+1),question=re.sub(r'^\d+\. ','',p),answer=pars[i+1],sort_order=len(faq)+1))
for i,p in enumerate(pars):
    if re.match(r'^[1-5]\. (Be punctual|Carry your student ID|Follow emergency procedures|Respect religious and cultural places|Maintain responsible behaviour)',p):
        rules.append(dict(seed_key='source-rule-'+str(len(rules)+1),title=re.sub(r'^\d+\. ','',p),body=pars[i+1],sort_order=len(rules)+1))
# Testimonials are explicitly labelled fictional in source.
for label in ['A Student\'s Experience','Convenient Trip Planning','Discovering New Destinations','A Better Travel Experience']:
    if label in pars:
        i=pars.index(label)
        quote=next((s.strip('“”"') for s in pars[i+1:i+5] if len(s)>75 and ('TripPack' in s or 'Planning' in s or 'explore' in s)),None)
        if quote: testimonials.append(dict(seed_key='source-testimonial-'+str(len(testimonials)+1),title=label,quote=quote.replace('TripPack','Sherubtse TripHub'),attribution='Sherubtse College Student (fictional sample)',sort_order=len(testimonials)+1,is_sample=True))
seed={'source':'TripPack.docx','notice':'Source trip schedules, prices and users are DEMONSTRATION examples, not real trips or official college-approved events.','programmes':programmes,'destinations':dests,'source_trips':trips,'demo_students':users,'faqs':faq,'trip_rules':rules,'testimonials':testimonials}
out=ROOT/'db'/'seed-data.json';out.write_text(json.dumps(seed,indent=2,ensure_ascii=False)+'\n')
print('Generated',out,'destination',len(dests),'trips',len(trips),'students',len(users),'FAQs',len(faq),'rules',len(rules),'testimonials',len(testimonials))
