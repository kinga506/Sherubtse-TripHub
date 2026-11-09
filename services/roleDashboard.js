const DASHBOARDS = Object.freeze({
  student: '/workspace/student',
  dsa: '/workspace/dsa',
  admin: '/workspace/superadmin'
});

function dashboardPath(role) {
  return DASHBOARDS[role] || '/account';
}

module.exports = { dashboardPath };
