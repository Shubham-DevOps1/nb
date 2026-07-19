const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeeFilterOptions, getEmployee } = require('./employeeController');

// Order matters: /filter-options must be registered before the /:employeeId
// wildcard route, or Express would treat "filter-options" as an employeeId.
router.get('/employees/filter-options', getEmployeeFilterOptions);
router.get('/employees/:employeeId', getEmployee);
router.get('/employees', getEmployees);

module.exports = router;
