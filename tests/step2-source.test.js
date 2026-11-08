const fs=require('node:fs');
const path=require('node:path');
const data=require('../db/seed-data.json');
const root=path.join(__dirname,'..');

describe('Step 2 source fixtures',()=>{
  test('original source records present',()=>{
    expect(data.destinations).toHaveLength(6);
    expect(data.source_trips).toHaveLength(5);
    expect(data.demo_students).toHaveLength(12);
    expect(data.programmes).toHaveLength(8);
    expect(data.faqs).toHaveLength(8);
    expect(data.trip_rules).toHaveLength(5);
    expect(data.testimonials).toHaveLength(4);
  });
  test('all photo files match six destination slugs',()=>{
    for(const d of data.destinations){
      expect(fs.existsSync(path.join(root,'public',d.photo))).toBe(true);
    }
  });
  test('sample trips have no invented costs and full itinerary',()=>{
    for(const trip of data.source_trips){
      expect(trip.estimated_budget_note).toMatch(/not provided/);
      expect(trip).not.toHaveProperty('cost_items');
      expect(trip.itinerary.length).toBeGreaterThan(0);
      expect(trip.packing_suggestions.length).toBeGreaterThan(0);
    }
  });
  test('demo accounts use only Student accounts',()=>{
    for(const user of data.demo_students){
      expect(user.email).toMatch(/^\d+\.sherubtse@rub\.edu\.bt$/);
      expect(user).not.toHaveProperty('role','coordinator');
    }
  });
  test('schema contains permissions, versions, and archival tables',()=>{
    const sql=fs.readFileSync(path.join(root,'db','schema.sql'),'utf8');
    for(const tab of ['trip_coordinators','trip_submissions','trip_attachments','participant_consent_documents','final_participant_submissions','final_participant_review_history','trip_final_reports','session']){
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS '+tab);
    }
    expect(sql).not.toContain('CREATE TABLE IF NOT EXISTS coordinator_access_requests');
  });
});
