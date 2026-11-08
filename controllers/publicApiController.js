const PublicTrip = require('../models/PublicTrip');
const Destination = require('../models/Destination');
const { registrationStatus } = require('../services/tripDiscovery');

// Public API responses are explicit projections, not raw database rows.
function publicTrip(row) {
  const status = registrationStatus(row);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    purpose: row.purpose,
    destination: {
      name: row.destination_name,
      slug: row.destination_slug,
      dzongkhag: row.dzongkhag,
      photograph: row.destination_photo || null
    },
    start_date: row.start_date,
    end_date: row.end_date,
    meeting_point: row.meeting_point,
    meeting_time: row.meeting_time,
    transport_information: row.transport_information,
    safety_information: row.safety_information,
    emergency_contact: {
      name: row.emergency_contact_name || null,
      phone: row.emergency_contact_phone || null
    },
    estimated_cost_nu: row.estimated_cost,
    estimated_budget_note: row.estimated_budget_note,
    participant_limit: Number(row.max_participants),
    pending_and_approved_seats: Number(row.occupied_seats) || 0,
    approved_participants: Number(row.confirmed_participants) || 0,
    available_seats: status.available,
    registration_deadline: row.registration_deadline,
    registration: { status: status.key, label: status.label, open: status.key === 'open' },
    is_sample: Boolean(row.is_sample)
  };
}

function publicDestination(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    dzongkhag: row.dzongkhag,
    description: row.description,
    best_season: row.best_season,
    distance_from_sherubtse: row.distance_text,
    driving_time: row.drive_time_text,
    trekking_time: row.trek_time_text,
    is_trek: Boolean(row.is_trek),
    estimated_transport_cost_min_nu: row.transport_cost_min,
    estimated_transport_cost_max_nu: row.transport_cost_max,
    photograph: row.photo || null,
    photograph_alt: row.alt_text || null,
    photograph_credit: row.photo_credit || null
  };
}

async function trips(req, res, next) {
  try {
    const filters = PublicTrip.cleanFilters(req.query);
    const rows = await PublicTrip.list(filters);
    return res.json({ trips: rows.map(publicTrip), count: rows.length, filters });
  } catch (error) { return next(error); }
}

async function tripDetail(req, res, next) {
  try {
    if (!/^[1-9]\d{0,14}$/.test(req.params.id)) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const row = await PublicTrip.getById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Trip not found' });
    const costItems = await PublicTrip.getCostItems(row.id);
    return res.json({ trip: { ...publicTrip(row), estimated_cost_items: costItems.map(item => ({ label: item.label, amount_nu: item.amount })) } });
  } catch (error) { return next(error); }
}

async function destinations(req, res, next) {
  try {
    const rows = await Destination.getAll();
    return res.json({ destinations: rows.map(publicDestination), count: rows.length });
  } catch (error) { return next(error); }
}

module.exports = { trips, tripDetail, destinations, publicTrip, publicDestination };
