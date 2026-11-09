jest.mock('../models/PublicTrip', () => ({
  list: jest.fn(), getById: jest.fn(), getCostItems: jest.fn()
}));
jest.mock('../models/Destination', () => ({ getAll: jest.fn() }));

const PublicTrip = require('../models/PublicTrip');
const Destination = require('../models/Destination');
const api = require('../controllers/publicApiController');

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}
const trip = {
  id: 3, title: 'Sample approved trip', description: 'Public details',
  start_date: '2099-03-01', end_date: '2099-03-02',
  destination_name: 'Chorten Kora', destination_slug: 'chorten-kora', dzongkhag: 'Trashiyangtse',
  estimated_cost: 1800, max_participants: 10, occupied_seats: 7, confirmed_participants: 5,
  registration_open: true, vacancies_held_closed: false, registration_deadline: '2099-02-26',
  is_sample: false, public_stage:'upcoming',
  password_hash: 'never-expose', private_attachment_key: 'secret',
  proposed_by_user_id: 19, dsa_remarks: 'private'
};

beforeEach(() => jest.clearAllMocks());

test('trip listing uses the shared public model and omits sensitive database fields', async () => {
  PublicTrip.list.mockResolvedValue([trip]);
  const res = response();
  await api.trips({ query: { registration: 'all',q:'hidden filter' } }, res, jest.fn());
  expect(PublicTrip.list).toHaveBeenCalled();
  const payload = res.json.mock.calls[0][0];
  expect(payload.count).toBe(1);
  expect(payload).not.toHaveProperty('filters');
  expect(payload.trips[0].registration.open).toBe(true);
  expect(payload.trips[0].pending_and_approved_seats).toBe(7);
  expect(payload.trips[0].approved_participants).toBe(5);
  expect(payload.trips[0].available_seats).toBe(3);
  for (const key of ['password_hash', 'private_attachment_key', 'proposed_by_user_id', 'dsa_remarks']) {
    expect(JSON.stringify(payload)).not.toContain(key);
  }
});

test('trip detail rejects invalid identifiers and unknown/unpublished trips as JSON 404', async () => {
  const invalid = response();
  await api.tripDetail({ params: { id: '../1' } }, invalid, jest.fn());
  expect(invalid.status).toHaveBeenCalledWith(404);
  expect(PublicTrip.getById).not.toHaveBeenCalled();
  PublicTrip.getById.mockResolvedValue(null);
  const missing = response();
  await api.tripDetail({ params: { id: '4' } }, missing, jest.fn());
  expect(missing.status).toHaveBeenCalledWith(404);
  expect(PublicTrip.getCostItems).not.toHaveBeenCalled();
});

test('trip detail includes cost breakdown without unrelated financial records', async () => {
  PublicTrip.getById.mockResolvedValue(trip);
  PublicTrip.getCostItems.mockResolvedValue([{ label: 'Transport', amount: 600 }]);
  const res = response();
  await api.tripDetail({ params: { id: '3' } }, res, jest.fn());
  expect(res.json.mock.calls[0][0].trip.estimated_cost_items).toEqual([{ label: 'Transport', amount_nu: 600 }]);
});

test('destination listing returns only public destination fields', async () => {
  Destination.getAll.mockResolvedValue([{ id: 4, slug: 'takila', name: 'Takila', dzongkhag: 'Lhuentse',
    photo: '/images/takila.jpg', photo_credit: 'Contributor', internal_note: 'private' }]);
  const res = response();
  await api.destinations({}, res, jest.fn());
  const payload = res.json.mock.calls[0][0];
  expect(payload.count).toBe(1);
  expect(payload.destinations[0].photograph_credit).toBe('Contributor');
  expect(payload.destinations[0]).not.toHaveProperty('internal_note');
});

test('model visibility and registration checks are shared with HTML trip pages', () => {
  expect(PublicTrip.getById).toBeDefined();
  const fs = require('node:fs');
  const source = fs.readFileSync(require.resolve('../models/PublicTrip'), 'utf8');
  expect(source).toContain("t.approval_status='approved'");
  expect(source).toContain("c.assignment_role='lead'");
  expect(source).toContain("t.operational_status IN ('planned','ongoing')");
  expect(source).toContain('t.is_publicly_hidden=FALSE');
  const routeSource = fs.readFileSync(require.resolve('../routes/api'), 'utf8');
  expect(routeSource).not.toMatch(/router\.(post|put|patch|delete)\(/);
});
