const { listEmployees, getFilterOptions, getEmployeeById } = require('../employees/employeeDirectory');
const logger = require('../utils/logger');

/**
 * Handles GET /api/employees?search=&department=&availability=&designation=
 * &location=&skill=&minExperience=&maxExperience=&sortBy=&sortDir=&page=&pageSize=
 * Plain browse/filter/paginate over the full workforce - see employeeDirectory.js
 * for why this is separate from the semantic /api/search endpoint.
 */
function getEmployees(req, res) {
  try {
    const result = listEmployees(req.query);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Employee directory list failed.', err);
    return res.status(500).json({
      error: 'Internal Server Error while listing employees.',
      message: err.message
    });
  }
}

/**
 * Handles GET /api/employees/filter-options
 * Real distinct values from the data, for populating directory filter dropdowns.
 */
function getEmployeeFilterOptions(req, res) {
  try {
    const options = getFilterOptions();
    return res.status(200).json(options);
  } catch (err) {
    logger.error('Employee filter options lookup failed.', err);
    return res.status(500).json({
      error: 'Internal Server Error while loading filter options.',
      message: err.message
    });
  }
}

/**
 * Handles GET /api/employees/:employeeId
 */
function getEmployee(req, res) {
  try {
    const employee = getEmployeeById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ error: `No employee found with ID '${req.params.employeeId}'.` });
    }
    return res.status(200).json(employee);
  } catch (err) {
    logger.error(`Employee detail lookup failed for ID: ${req.params.employeeId}`, err);
    return res.status(500).json({
      error: 'Internal Server Error while loading employee detail.',
      message: err.message
    });
  }
}

module.exports = { getEmployees, getEmployeeFilterOptions, getEmployee };
